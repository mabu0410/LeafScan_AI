import { HomeSummary } from '../types/home';

export const MOCK_HOME_SUMMARY: HomeSummary = {
  user: {
    id: 2,
    name: 'Vũ Mạnh Bảo',
    email: 'vumanhbao0411@gmail.com',
    avatar: null,
  },
  stats: {
    averageHealth: 85,
    scannedPlants: 1,
    alerts: 3,
  },
  todayTip: {
    id: 1,
    slug: 'tuoi-nuoc-vao-buoi-sang',
    title: 'Tưới nước vào buổi sáng',
    summary: 'Giúp lá khô nhanh, giảm nguy cơ nấm bệnh.',
    content:
      'Tưới cây vào sáng sớm giúp cây hấp thụ nước tốt hơn và hạn chế nấm bệnh phát triển trên lá. Ưu tiên tưới vào gốc, tránh làm ướt mặt lá quá lâu vào chiều tối.',
    category: 'Chăm sóc cơ bản',
    suitablePlants: ['Cà chua', 'Ớt', 'Rau lá'],
  },
  weather: {
    location: 'Hà Nội',
    temperatureC: null,
    humidityPercent: null,
    windSpeedKmh: null,
    condition: 'Không có dữ liệu',
    weatherCode: null,
    observedAt: null,
  },
  gardenSummary: {
    attentionPlants: 3,
    lastScanAt: '2026-05-04T16:00:00+07:00',
  },
  attentionPlants: [],
  recentScans: [
    {
      id: 1,
      plantName: 'Cây chưa đặt tên',
      resultName: 'Ngô Khỏe Mạnh',
      confidence: 89,
      status: 'healthy',
      scannedAt: '2026-05-04T16:00:00+07:00',
      imageUrl: null,
    },
  ],
  recentActivities: [],
  todayTasks: [],
  careLogs: [],
};
