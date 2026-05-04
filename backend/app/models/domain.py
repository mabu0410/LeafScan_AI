"""
SQLAlchemy Domain Models (Database Tables)
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    """Bảng lưu thông tin người dùng."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    plants = relationship("Plant", back_populates="user", cascade="all, delete-orphan")
    scans = relationship("ScanHistory", back_populates="user", cascade="all, delete-orphan")

class Plant(Base):
    """Bảng lưu thông tin các cây trồng trong khu vườn (My Garden)."""
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    latin_name = Column(String)
    category = Column(String)
    image_url = Column(String)
    thumbnail_url = Column(String)
    location = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Custom scoring (could be updated by scans)
    health_score = Column(Float, default=100.0)

    user = relationship("User", back_populates="plants")
    scans = relationship("ScanHistory", back_populates="plant")

class Disease(Base):
    """Bách khoa toàn thư chứa thông tin các bệnh."""
    __tablename__ = "diseases"

    id = Column(Integer, primary_key=True, index=True)
    disease_key = Column(String, unique=True, index=True)  # AI output label, e.g. "tomato_early_blight"
    name = Column(String, nullable=False)
    severity = Column(String)                              # "healthy", "moderate", "severe"
    description = Column(Text)
    symptoms = Column(JSON)                                # Danh sách string
    treatment = Column(JSON)                               # Phác đồ điều trị
    prevention = Column(JSON)                              # Cách phòng ngừa
    affected_area_typical = Column(Integer, default=0)
    image_url = Column(String)

class ScanHistory(Base):
    """Bảng lưu lịch sử quét ảnh."""
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="SET NULL"), nullable=True)
    disease_key = Column(String, ForeignKey("diseases.disease_key", ondelete="SET NULL"), nullable=True)
    image_url = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    predicted_stage = Column(String, nullable=False, default="unknown")
    forecast_stage_7d = Column(String, nullable=False, default="unknown")
    affected_area_snapshot = Column(Float, nullable=True)
    scan_date = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="scans")
    plant = relationship("Plant", back_populates="scans")
    disease = relationship("Disease")
