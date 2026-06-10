import React, { useEffect, useState } from 'react';
import { Upload, CheckCircle2, Save, XCircle } from 'lucide-react';
import { settingsApi, SystemSetting, AIModel } from '../api/settings';

export const SettingsPage = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, modelsRes] = await Promise.all([
        settingsApi.getAllSettings(),
        settingsApi.listModels(),
      ]);
      setSettings(settingsRes);
      
      const values: Record<string, string> = {};
      settingsRes.forEach(s => {
        values[s.key] = s.value;
      });
      setEditValues(values);
      setModels(modelsRes);
    } catch (error) {
      console.error('Failed to load settings', error);
      alert('Không thể tải cấu hình. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettingChange = (key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSetting = async (key: string) => {
    try {
      await settingsApi.updateSetting(key, editValues[key]);
      alert('Lưu thành công');
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Lưu thất bại');
    }
  };

  const handleUploadModel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    try {
      await settingsApi.uploadModel(e.target.files[0]);
      alert('Upload thành công!');
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Upload thất bại!');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleActivateModel = async (path: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn kích hoạt model này?')) return;
    
    try {
      await settingsApi.activateModel(path);
      alert('Kích hoạt thành công!');
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Kích hoạt thất bại!');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="cardContent" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settingsContainer" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="card">
        <div className="cardHeader" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #eee', paddingBottom: 0 }}>
          <button 
            className={`tabButton ${tabIndex === 0 ? 'active' : ''}`} 
            onClick={() => setTabIndex(0)}
            style={{ padding: '1rem', background: 'none', border: 'none', borderBottom: tabIndex === 0 ? '2px solid var(--primary-color)' : '2px solid transparent', cursor: 'pointer', fontWeight: tabIndex === 0 ? 'bold' : 'normal', color: tabIndex === 0 ? 'var(--primary-color)' : 'inherit' }}
          >
            Cấu hình ngưỡng AI
          </button>
          <button 
            className={`tabButton ${tabIndex === 1 ? 'active' : ''}`} 
            onClick={() => setTabIndex(1)}
            style={{ padding: '1rem', background: 'none', border: 'none', borderBottom: tabIndex === 1 ? '2px solid var(--primary-color)' : '2px solid transparent', cursor: 'pointer', fontWeight: tabIndex === 1 ? 'bold' : 'normal', color: tabIndex === 1 ? 'var(--primary-color)' : 'inherit' }}
          >
            Quản lý Model AI
          </button>
        </div>
        
        <div className="cardContent" style={{ padding: '1.5rem' }}>
          {tabIndex === 0 && (
            <div className="dataGrid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {settings.map(setting => (
                <div key={setting.key} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>{setting.key}</label>
                    <input 
                      className="inputField" 
                      type="text" 
                      value={editValues[setting.key] || ''}
                      onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
                      {setting.description} (Loại: {setting.type})
                    </small>
                  </div>
                  <button 
                    className="primaryButton" 
                    onClick={() => handleSaveSetting(setting.key)}
                    disabled={editValues[setting.key] === setting.value}
                    style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: editValues[setting.key] === setting.value ? 0.5 : 1, cursor: editValues[setting.key] === setting.value ? 'not-allowed' : 'pointer' }}
                  >
                    <Save size={16} /> Lưu
                  </button>
                </div>
              ))}
            </div>
          )}

          {tabIndex === 1 && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="primaryButton" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                  <Upload size={16} />
                  {uploading ? 'Đang tải lên...' : 'Tải lên Model Mới (.onnx)'}
                  <input type="file" hidden accept=".onnx,.tflite" onChange={handleUploadModel} disabled={uploading} />
                </label>
              </div>

              <div className="dataGrid">
                {models.map((model, idx) => (
                  <div key={model.path} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderTop: idx > 0 ? '1px solid #f0f0f0' : 'none' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem' }}>{model.filename}</h4>
                        {model.is_active && (
                          <span className="statusPill status-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={14} /> Đang hoạt động
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#666', fontSize: '0.875rem' }}>
                        Kích thước: {model.size_mb} MB | Đường dẫn: {model.path}
                      </div>
                    </div>
                    <div>
                      {!model.is_active && (
                        <button className="secondaryButton" onClick={() => handleActivateModel(model.path)}>
                          Kích hoạt
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {models.length === 0 && (
                  <p style={{ color: '#666' }}>Chưa có file model nào trong hệ thống.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
