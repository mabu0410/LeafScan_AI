import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  CareLogPayload,
  CareTaskPayload,
  createCareLogApi,
  createCareTaskApi,
  deleteCareLogApi,
  deleteCareTaskApi,
  listCareLogsApi,
  listCareTasksApi,
  updateCareLogApi,
  updateCareTaskApi,
} from '../api/care';
import { RootStackParamList } from '../types';
import { HomeCareLog, HomeTask } from '../types/home';
import { useAuthStore } from '../stores/authStore';
import { usePlantsStore } from '../stores/plantsStore';
import { theme } from '../theme/theme';
import { fetchWithCache } from '../utils/offlineCache';

type Nav = StackNavigationProp<RootStackParamList, 'CareCenter'>;
type Route = RouteProp<RootStackParamList, 'CareCenter'>;
type Tab = 'tasks' | 'logs';

const TASK_TYPES = [
  { id: 'watering', label: 'Tưới nước' },
  { id: 'fertilizing', label: 'Bón phân' },
  { id: 'inspection', label: 'Kiểm tra sâu bệnh' },
  { id: 'general', label: 'Khác' },
];

const LOG_TYPES = [
  { id: 'watering', label: 'Tưới nước' },
  { id: 'fertilizing', label: 'Bón phân' },
  { id: 'pruning', label: 'Cắt tỉa' },
  { id: 'inspection', label: 'Kiểm tra' },
  { id: 'general', label: 'Khác' },
];

function nowInput() {
  return new Date().toISOString().slice(0, 16);
}

function inputFromOffset(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString().slice(0, 16);
}

function toApiDate(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  const date = new Date(clean);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toInputDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function labelFor(options: Array<{ id: string; label: string }>, value: string) {
  return options.find((item) => item.id === value)?.label || value;
}

export default function CareCenterScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const token = useAuthStore((state) => state.accessToken);
  const plants = usePlantsStore((state) => state.plants);
  const loadPlants = usePlantsStore((state) => state.loadPlants);
  const [tab, setTab] = useState<Tab>(route.params?.initialTab || 'tasks');
  const [tasks, setTasks] = useState<HomeTask[]>([]);
  const [logs, setLogs] = useState<HomeCareLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState<CareTaskPayload>({
    title: '',
    taskType: 'watering',
    dueAt: nowInput(),
    status: 'pending',
    plantId: null,
  });
  const [logForm, setLogForm] = useState<CareLogPayload>({
    title: '',
    description: '',
    logType: 'watering',
    performedAt: nowInput(),
    plantId: null,
  });

  const selectedTaskPlant = useMemo(() => plants.find((plant) => Number(plant.id) === taskForm.plantId), [plants, taskForm.plantId]);
  const selectedLogPlant = useMemo(() => plants.find((plant) => Number(plant.id) === logForm.plantId), [plants, logForm.plantId]);

  const loadAll = async () => {
    if (!token) return;
    setLoading(true);
    setFromCache(false);
    try {
      const cacheUserId = useAuthStore.getState().user?.id || 'me';
      const [taskRows, logRows] = await Promise.all([
        fetchWithCache(`care-tasks:${cacheUserId}`, () => listCareTasksApi(token)),
        fetchWithCache(`care-logs:${cacheUserId}`, () => listCareLogsApi(token)),
        loadPlants(),
      ]);
      setTasks(taskRows.data);
      setLogs(logRows.data);
      setFromCache(taskRows.fromCache || logRows.fromCache);
    } catch (error: any) {
      Alert.alert('Không tải được dữ liệu', error?.message || 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll().catch(() => undefined);
  }, [token]);

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskForm({ title: '', taskType: 'watering', dueAt: nowInput(), status: 'pending', plantId: null });
  };

  const resetLogForm = () => {
    setEditingLogId(null);
    setLogForm({ title: '', description: '', logType: 'watering', performedAt: nowInput(), plantId: null });
  };

  const saveTask = async () => {
    if (!token) return;
    if (!taskForm.title.trim()) {
      Alert.alert('Thiếu tiêu đề', 'Vui lòng nhập tên việc chăm sóc.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...taskForm, title: taskForm.title.trim(), dueAt: toApiDate(taskForm.dueAt || '') };
      if (editingTaskId) {
        const updated = await updateCareTaskApi(token, editingTaskId, payload);
        setTasks((rows) => rows.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createCareTaskApi(token, payload);
        setTasks((rows) => [created, ...rows]);
      }
      resetTaskForm();
    } catch (error: any) {
      Alert.alert('Không lưu được lịch chăm sóc', error?.message || 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const saveLog = async () => {
    if (!token) return;
    if (!logForm.title.trim()) {
      Alert.alert('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề nhật ký.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...logForm, title: logForm.title.trim(), performedAt: toApiDate(logForm.performedAt || '') };
      if (editingLogId) {
        const updated = await updateCareLogApi(token, editingLogId, payload);
        setLogs((rows) => rows.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createCareLogApi(token, payload);
        setLogs((rows) => [created, ...rows]);
      }
      resetLogForm();
    } catch (error: any) {
      Alert.alert('Không lưu được nhật ký', error?.message || 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const editTask = (task: HomeTask) => {
    setTab('tasks');
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      taskType: task.taskType,
      dueAt: toInputDate(task.dueAt),
      status: task.status,
      plantId: task.plantId,
    });
  };

  const editLog = (log: HomeCareLog) => {
    setTab('logs');
    setEditingLogId(log.id);
    setLogForm({
      title: log.title,
      description: log.description || '',
      logType: log.logType,
      performedAt: toInputDate(log.performedAt),
      plantId: log.plantId,
    });
  };

  const completeTask = async (task: HomeTask) => {
    if (!token) return;
    const updated = await updateCareTaskApi(token, task.id, { status: task.status === 'completed' ? 'pending' : 'completed' });
    setTasks((rows) => rows.map((item) => (item.id === updated.id ? updated : item)));
  };

  const removeTask = (task: HomeTask) => {
    if (!token) return;
    Alert.alert('Xóa việc chăm sóc', `Xóa "${task.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteCareTaskApi(token, task.id);
          setTasks((rows) => rows.filter((item) => item.id !== task.id));
        },
      },
    ]);
  };

  const removeLog = (log: HomeCareLog) => {
    if (!token) return;
    Alert.alert('Xóa nhật ký', `Xóa "${log.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteCareLogApi(token, log.id);
          setLogs((rows) => rows.filter((item) => item.id !== log.id));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>VƯỜN CỦA TÔI</Text>
          <Text style={styles.title}>Lịch & nhật ký chăm sóc</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TabButton active={tab === 'tasks'} label="Lịch chăm sóc" onPress={() => setTab('tasks')} />
        <TabButton active={tab === 'logs'} label="Nhật ký" onPress={() => setTab('logs')} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {fromCache ? (
          <View style={styles.cacheBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#8A5A00" />
            <Text style={styles.cacheBannerText}>Dữ liệu đã lưu</Text>
          </View>
        ) : null}
        {tab === 'tasks' ? (
          <>
            <View style={styles.card}>
              <FormHeader title={editingTaskId ? 'Sửa việc chăm sóc' : 'Tạo việc chăm sóc'} onReset={editingTaskId ? resetTaskForm : undefined} />
              <Field label="Tiêu đề" value={taskForm.title} onChangeText={(title) => setTaskForm((form) => ({ ...form, title }))} placeholder="Ví dụ: Tưới nước luống cà chua" />
              <OptionRow value={taskForm.taskType} options={TASK_TYPES} onChange={(taskType) => setTaskForm((form) => ({ ...form, taskType }))} />
              <Field label="Thời gian" value={taskForm.dueAt || ''} onChangeText={(dueAt) => setTaskForm((form) => ({ ...form, dueAt }))} placeholder="YYYY-MM-DDTHH:mm" />
              <DateQuickActions
                onPick={(dueAt) => setTaskForm((form) => ({ ...form, dueAt }))}
                options={[
                  ['Bây giờ', nowInput()],
                  ['+1 giờ', inputFromOffset(1)],
                  ['Ngày mai', inputFromOffset(24)],
                ]}
              />
              <PlantSelector plants={plants} selectedId={taskForm.plantId} onSelect={(plantId) => setTaskForm((form) => ({ ...form, plantId }))} selectedName={selectedTaskPlant?.name} />
              <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={saveTask} disabled={saving}>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveText}>{editingTaskId ? 'Lưu thay đổi' : 'Tạo lịch'}</Text>
              </Pressable>
            </View>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onEdit={editTask} onDelete={removeTask} onComplete={completeTask} />
            ))}
          </>
        ) : (
          <>
            <View style={styles.card}>
              <FormHeader title={editingLogId ? 'Sửa nhật ký' : 'Ghi nhật ký chăm sóc'} onReset={editingLogId ? resetLogForm : undefined} />
              <Field label="Tiêu đề" value={logForm.title} onChangeText={(title) => setLogForm((form) => ({ ...form, title }))} placeholder="Ví dụ: Đã bón phân hữu cơ" />
              <OptionRow value={logForm.logType} options={LOG_TYPES} onChange={(logType) => setLogForm((form) => ({ ...form, logType }))} />
              <Field label="Thời gian" value={logForm.performedAt || ''} onChangeText={(performedAt) => setLogForm((form) => ({ ...form, performedAt }))} placeholder="YYYY-MM-DDTHH:mm" />
              <DateQuickActions
                onPick={(performedAt) => setLogForm((form) => ({ ...form, performedAt }))}
                options={[
                  ['Bây giờ', nowInput()],
                  ['Hôm qua', inputFromOffset(-24)],
                  ['Tuần trước', inputFromOffset(-24 * 7)],
                ]}
              />
              <Field label="Ghi chú" value={logForm.description || ''} onChangeText={(description) => setLogForm((form) => ({ ...form, description }))} placeholder="Ghi lại tình trạng cây, lượng nước, phân bón..." multiline />
              <PlantSelector plants={plants} selectedId={logForm.plantId} onSelect={(plantId) => setLogForm((form) => ({ ...form, plantId }))} selectedName={selectedLogPlant?.name} />
              <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={saveLog} disabled={saving}>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveText}>{editingLogId ? 'Lưu thay đổi' : 'Lưu nhật ký'}</Text>
              </Pressable>
            </View>
            {logs.map((log) => (
              <LogRow key={log.id} log={log} onEdit={editLog} onDelete={removeLog} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FormHeader({ title, onReset }: { title: string; onReset?: () => void }) {
  return (
    <View style={styles.formHeader}>
      <Text style={styles.formTitle}>{title}</Text>
      {onReset ? (
        <Pressable onPress={onReset}>
          <Text style={styles.cancelText}>Tạo mới</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        multiline={multiline}
      />
    </View>
  );
}

function DateQuickActions({ options, onPick }: { options: Array<[string, string]>; onPick: (value: string) => void }) {
  return (
    <View style={styles.dateQuickRow}>
      {options.map(([label, value]) => (
        <Pressable key={label} style={styles.dateQuickButton} onPress={() => onPick(value)}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.dateQuickText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function OptionRow({ value, options, onChange }: { value: string; options: Array<{ id: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <View style={styles.optionRow}>
      {options.map((item) => (
        <Pressable key={item.id} style={[styles.chip, value === item.id && styles.chipActive]} onPress={() => onChange(item.id)}>
          <Text style={[styles.chipText, value === item.id && styles.chipTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PlantSelector({ plants, selectedId, selectedName, onSelect }: { plants: any[]; selectedId?: number | null; selectedName?: string; onSelect: (plantId: number | null) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Cây liên quan</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
        <Pressable style={[styles.chip, selectedId == null && styles.chipActive]} onPress={() => onSelect(null)}>
          <Text style={[styles.chipText, selectedId == null && styles.chipTextActive]}>Không gắn cây</Text>
        </Pressable>
        {plants.map((plant) => {
          const id = Number(plant.id);
          const active = selectedId === id;
          return (
            <Pressable key={plant.id} style={[styles.chip, active && styles.chipActive]} onPress={() => onSelect(id)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{plant.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {selectedName ? <Text style={styles.helperText}>Đang chọn: {selectedName}</Text> : null}
    </View>
  );
}

function TaskRow({ task, onEdit, onDelete, onComplete }: { task: HomeTask; onEdit: (task: HomeTask) => void; onDelete: (task: HomeTask) => void; onComplete: (task: HomeTask) => void }) {
  const done = task.status === 'completed';
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowIcon}>
        <Ionicons name={done ? 'checkmark-circle' : 'time-outline'} size={22} color={done ? '#059669' : theme.colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{task.title}</Text>
        <Text style={styles.rowMeta}>{labelFor(TASK_TYPES, task.taskType)} · {task.plantName || 'Không gắn cây'} · {task.dueAt ? toInputDate(task.dueAt).replace('T', ' ') : 'Chưa đặt giờ'}</Text>
      </View>
      <RowActions onComplete={() => onComplete(task)} onEdit={() => onEdit(task)} onDelete={() => onDelete(task)} done={done} />
    </View>
  );
}

function LogRow({ log, onEdit, onDelete }: { log: HomeCareLog; onEdit: (log: HomeCareLog) => void; onDelete: (log: HomeCareLog) => void }) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowIcon}>
        <Ionicons name="journal-outline" size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{log.title}</Text>
        <Text style={styles.rowMeta}>{labelFor(LOG_TYPES, log.logType)} · {log.plantName || 'Không gắn cây'} · {toInputDate(log.performedAt).replace('T', ' ')}</Text>
        {log.description ? <Text style={styles.rowDescription}>{log.description}</Text> : null}
      </View>
      <RowActions onEdit={() => onEdit(log)} onDelete={() => onDelete(log)} />
    </View>
  );
}

function RowActions({ onComplete, onEdit, onDelete, done }: { onComplete?: () => void; onEdit: () => void; onDelete: () => void; done?: boolean }) {
  return (
    <View style={styles.rowActions}>
      {onComplete ? (
        <Pressable style={styles.smallIconButton} onPress={onComplete}>
          <Ionicons name={done ? 'refresh-outline' : 'checkmark-outline'} size={18} color="#059669" />
        </Pressable>
      ) : null}
      <Pressable style={styles.smallIconButton} onPress={onEdit}>
        <Ionicons name="pencil-outline" size={18} color={theme.colors.textPrimary} />
      </Pressable>
      <Pressable style={styles.smallIconButton} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color="#DC2626" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E3E8E1' },
  eyebrow: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '800', letterSpacing: 0.6 },
  title: { fontSize: 24, color: theme.colors.textPrimary, fontWeight: '800' },
  tabs: { marginHorizontal: 20, padding: 4, borderRadius: 16, backgroundColor: '#EAF3E8', flexDirection: 'row' },
  tabButton: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: theme.colors.textMuted, fontWeight: '700' },
  tabTextActive: { color: theme.colors.primary },
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  cacheBanner: {
    alignSelf: 'flex-start',
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: '#FFF7DB',
    borderWidth: 1,
    borderColor: '#F2D58D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
  },
  cacheBannerText: {
    color: '#8A5A00',
    fontSize: 12,
    fontWeight: '800',
  },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E3E8E1', gap: 12 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  cancelText: { color: theme.colors.primary, fontWeight: '800' },
  field: { gap: 7 },
  label: { fontSize: 13, color: theme.colors.textPrimary, fontWeight: '800' },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#DDE7DA', borderRadius: 14, paddingHorizontal: 13, color: theme.colors.textPrimary, backgroundColor: '#FBFDFB' },
  textArea: { minHeight: 86, paddingTop: 12, textAlignVertical: 'top' },
  dateQuickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateQuickButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDE7DA',
    backgroundColor: '#F5FBF3',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateQuickText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: '#DDE7DA', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textMuted, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  helperText: { color: theme.colors.textMuted, fontSize: 12 },
  saveButton: { minHeight: 48, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.6 },
  rowCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#E3E8E1', flexDirection: 'row', gap: 12, alignItems: 'center' },
  rowIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EEF8EA', alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 15 },
  rowMeta: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  rowDescription: { color: theme.colors.textPrimary, fontSize: 13, marginTop: 4 },
  rowActions: { flexDirection: 'row', gap: 7 },
  smallIconButton: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: '#E3E8E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
