import React, { useMemo, useState } from 'react';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Droplets,
  PackagePlus,
  Plus,
  Trash2,
  Utensils,
} from 'lucide-react';
import {
  FoodItemRecord,
  FullSystemState,
  SupplyProjectionResult,
} from '../types';
import { AlertBanner } from './ui/AlertBanner';
import { DataColumn, DataTable } from './ui/DataTable';
import { StatusIndicator } from './ui/StatusIndicator';
import { apiRequest, formatRecordedTime } from './uiHelpers';

interface NutritionSuppliesViewProps {
  state: FullSystemState;
  onStateUpdated: (next: FullSystemState) => void;
}

const FOOD_CATEGORIES = [
  'Freeze-dried meals',
  'Ready-to-eat meals',
  'Snacks',
  'Fruits and vegetables',
  'Protein sources',
  'Beverages',
  'Emergency food supplies',
];

/**
 * Calm Nutrition & Food Supplies dashboard surfacing essential galley quantities,
 * honest supply duration projections, expiry/low-stock attention items, meal consumption
 * logging, and progressive-disclosure drawers for full nutrition targets and inventory entry.
 */
export const NutritionSuppliesView: React.FC<NutritionSuppliesViewProps> = ({
  state,
  onStateUpdated,
}) => {
  const foodState = state.food_state;
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const [drawer, setDrawer] = useState<'none' | 'consume' | 'add' | 'targets' | 'calculator'>('none');

  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);

  const [consumeForm, setConsumeForm] = useState({
    food_item_uid: foodState?.items?.[0]?.item_uid || 'FOOD-FD-001',
    quantity_consumed: 1,
    meal_type: 'Dinner',
    extra_water_ml: 250,
    notes: '',
  });

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Freeze-dried meals',
    quantity: 24,
    serving_size: '1 pouch (230g)',
    unit: 'portions',
    calories_per_serving: 460,
    protein_g: 24,
    carbs_g: 56,
    fat_g: 14,
    water_ml_per_serving: 180,
    vitamin_d_iu: 200,
    calcium_mg: 180,
    nutrition_complete: true,
    storage_requirements: 'Ambient Galley Rack',
    bay_location: 'Galley Bay C',
    expiry_sol: (foodState?.mission_config.current_mission_sol || 184) + 320,
    min_threshold: 16,
    critical_threshold: 8,
    daily_ration_per_astronaut: 0.5,
    food_source: 'User-Entered Mission Inventory',
    notes: '',
  });

  const curTargets = foodState?.nutrition_overview?.targets;
  const [targetForm, setTargetForm] = useState({
    calories_target_kcal: curTargets?.calories_target_kcal ?? 2850,
    protein_target_g: curTargets?.protein_target_g ?? 115,
    carbs_target_g: curTargets?.carbs_target_g ?? 360,
    fat_target_g: curTargets?.fat_target_g ?? 95,
    water_target_ml: curTargets?.water_target_ml ?? 2600,
    vitamin_d_target_iu: curTargets?.vitamin_d_target_iu ?? 800,
    calcium_target_mg: curTargets?.calcium_target_mg ?? 1200,
    notes: curTargets?.notes ?? '',
  });

  const [calcInput, setCalcInput] = useState({
    total_portions: 120,
    astronaut_count: 2,
    portions_per_astronaut_per_day: 3.0,
  });
  const [calcResult, setCalcResult] = useState<SupplyProjectionResult | null>(null);

  const filteredItems = useMemo(() => {
    if (!foodState) return [];
    return foodState.items.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      return true;
    });
  }, [foodState, categoryFilter, statusFilter]);

  if (!foodState) {
    return (
      <div className="tc-panel p-6 text-sm text-[var(--tc-text-muted)]">
        Food and nutrition supply telemetry is synchronizing...
      </div>
    );
  }

  const {
    summary,
    mission_config,
    category_projections,
    nutrition_overview,
    items,
    food_alerts,
    consumption_history,
  } = foodState;

  const toggleDrawer = (target: typeof drawer) => {
    setDrawer((prev) => (prev === target ? 'none' : target));
  };

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ consumption: any; state: FullSystemState }>('/api/food/consume', {
        method: 'POST',
        body: JSON.stringify(consumeForm),
      });
      if (res.state) onStateUpdated(res.state);
      setNotice({
        tone: 'ok',
        text: `Logged ${res.consumption.quantity_consumed} ${res.consumption.unit} of ${res.consumption.food_name} (${consumeForm.meal_type}).`,
      });
      setConsumeForm((p) => ({ ...p, notes: '' }));
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to log meal consumption.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ item: FoodItemRecord; state: FullSystemState }>(
        '/api/food/items',
        {
          method: 'POST',
          body: JSON.stringify({
            ...newItem,
            micronutrients: {
              vitamin_d_iu: Number(newItem.vitamin_d_iu) || 0,
              calcium_mg: Number(newItem.calcium_mg) || 0,
            },
          }),
        },
      );
      if (res.state) onStateUpdated(res.state);
      setNotice({ tone: 'ok', text: `Added "${res.item.name}" to onboard galley stock.` });
      setNewItem((p) => ({ ...p, name: '', notes: '' }));
      setDrawer('none');
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to add food item.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveQty = async (item: FoodItemRecord) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ state: FullSystemState }>(`/api/food/items/${item.item_uid}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: Number(editQty), notes: item.notes }),
      });
      if (res.state) onStateUpdated(res.state);
      setEditingUid(null);
      setNotice({ tone: 'ok', text: `Updated "${item.name}" stock to ${editQty} ${item.unit}.` });
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to update stock quantity.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveItem = async (item: FoodItemRecord) => {
    setBusy(true);
    setNotice(null);
    try {
      const reason =
        item.status === 'EXPIRED'
          ? `Disposed expired ration (Sol ${item.expiry_sol})`
          : 'Removed from galley audit';
      const res = await apiRequest<{ state: FullSystemState }>(
        `/api/food/items/${item.item_uid}?reason=${encodeURIComponent(reason)}`,
        { method: 'DELETE' },
      );
      if (res.state) onStateUpdated(res.state);
      setNotice({ tone: 'ok', text: `Removed "${item.name}" from active stock.` });
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to remove food item.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ state: FullSystemState }>('/api/food/targets', {
        method: 'POST',
        body: JSON.stringify({ crew_id: state.active_crew_id, ...targetForm }),
      });
      if (res.state) onStateUpdated(res.state);
      setNotice({
        tone: 'ok',
        text: `Updated individualized nutrition targets for ${state.astronaut.name}.`,
      });
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Unable to update targets.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCalculateProjection = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiRequest<SupplyProjectionResult>('/api/food/estimate', {
        method: 'POST',
        body: JSON.stringify({
          ...calcInput,
          current_sol: mission_config.current_mission_sol,
          planned_mission_end_sol: mission_config.planned_mission_end_sol,
          next_resupply_sol: mission_config.next_resupply_sol,
        }),
      });
      setCalcResult(res);
    } finally {
      setBusy(false);
    }
  };

  const itemColumns: DataColumn<FoodItemRecord>[] = [
    {
      key: 'name',
      header: 'Food Item',
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <div className="font-medium text-[var(--tc-text)]">{r.name}</div>
          <div className="text-xs text-[var(--tc-text-muted)]">
            {r.category} · {r.bay_location} · {r.calories_per_serving} kcal/serving
            {!r.nutrition_complete && ' · Partial nutrition estimate'}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      sortValue: (r) => r.quantity,
      render: (r) =>
        editingUid === r.item_uid ? (
          <div className="inline-flex items-center gap-1.5 justify-end">
            <input
              type="number"
              aria-label={`Quantity for ${r.name}`}
              min={0}
              step={1}
              value={editQty}
              onChange={(e) => setEditQty(Number(e.target.value) || 0)}
              className="tc-input w-20 px-2 py-1 text-xs tabular-data text-right"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSaveQty(r)}
              className="tc-btn-primary px-2.5 py-1 text-xs"
            >
              Save
            </button>
          </div>
        ) : (
          <span className="tabular-data font-medium text-[var(--tc-text)]">
            {r.quantity} {r.unit}
          </span>
        ),
    },
    {
      key: 'expiry',
      header: 'Expiry Horizon',
      align: 'right',
      sortValue: (r) => r.sols_until_expiry,
      render: (r) => (
        <span className="tabular-data text-xs">
          Sol {r.expiry_sol} ({r.sols_until_expiry >= 0 ? `${r.sols_until_expiry}d left` : 'Expired'})
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusIndicator status={r.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              setEditingUid(r.item_uid);
              setEditQty(r.quantity);
            }}
            className="text-xs text-[var(--tc-accent)] hover:underline"
          >
            Adjust
          </button>
          {(r.status === 'EXPIRED' || r.quantity <= 0) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleRemoveItem(r)}
              aria-label={`Remove ${r.name}`}
              className="p-1 text-[var(--tc-crit-fg)] hover:opacity-80"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Action Bar */}
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 pb-6 border-b border-[var(--tc-border)]">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--tc-text)]">
            Nutrition &amp; Food Supplies
          </h1>
          <p className="text-sm text-[var(--tc-text-secondary)]">
            Tracks mission galley inventory, expiry risk, hydration, and individualized nutrition intake.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => toggleDrawer('consume')}
            className="tc-btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <Utensils className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Log Meal</span>
          </button>
          <button
            type="button"
            onClick={() => toggleDrawer('add')}
            className="tc-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Supply Item</span>
          </button>
        </div>
      </section>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.tone === 'ok'
              ? 'border-[var(--tc-ok-border)] bg-[var(--tc-ok-bg)] text-[var(--tc-ok-fg)]'
              : 'border-[var(--tc-crit-border)] bg-[var(--tc-crit-bg)] text-[var(--tc-crit-fg)]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Calm Top Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="tc-panel p-5 space-y-1">
          <div className="text-xs text-[var(--tc-text-muted)]">Available Meal Portions</div>
          <div className="tabular-data text-2xl font-semibold text-[var(--tc-text)]">
            {summary.available_meal_portions}
          </div>
          <div className="text-xs text-[var(--tc-text-muted)]">Across {summary.total_food_items} items</div>
        </div>

        <div className="tc-panel p-5 space-y-1">
          <div className="text-xs text-[var(--tc-text-muted)]">Projected Meal Supply</div>
          <div className="tabular-data text-2xl font-semibold text-[var(--tc-text)]">
            ~{summary.estimated_meal_supply_days} days
          </div>
          <div className="text-xs text-[var(--tc-text-muted)]">Estimate · {mission_config.crew_count} crew</div>
        </div>

        <div className="tc-panel p-5 space-y-1">
          <div className="text-xs text-[var(--tc-text-muted)]">Low Stock / Expiring</div>
          <div className="tabular-data text-2xl font-semibold text-[var(--tc-text)]">
            {summary.low_stock_count} / {summary.expiring_soon_count}
          </div>
          <div className="text-xs text-[var(--tc-text-muted)]">Attention items</div>
        </div>

        <div className="tc-panel p-5 space-y-1">
          <div className="text-xs text-[var(--tc-text-muted)]">Daily Intake (Logged)</div>
          <div className="tabular-data text-2xl font-semibold text-[var(--tc-text)]">
            {Math.round(summary.daily_food_consumption_kcal)} kcal
          </div>
          <div className="text-xs text-[var(--tc-text-muted)]">
            Target {nutrition_overview.targets.calories_target_kcal} kcal
          </div>
        </div>

        <div className="tc-panel p-5 space-y-1">
          <div className="text-xs text-[var(--tc-text-muted)]">Potable Water Reserve</div>
          <div className="tabular-data text-2xl font-semibold text-[var(--tc-text)]">
            {summary.potable_water_liters.toFixed(1)} L
          </div>
          <div className="text-xs text-[var(--tc-text-muted)]">
            ~{summary.estimated_water_supply_days}d est. · {Math.round(summary.daily_water_consumption_ml)} ml today
          </div>
        </div>
      </section>

      {/* Conditional Food Alerts */}
      {food_alerts.length > 0 && (
        <section className="space-y-3">
          {food_alerts.slice(0, 3).map((fa) => (
            <AlertBanner
              key={fa.alert_uid}
              title={`${fa.affected_item_name} — ${fa.alert_type.replace(/_/g, ' ')}`}
              severity={fa.severity}
              description={`${fa.current_quantity} ${fa.unit} currently logged. ${fa.recommended_action}`}
              timestamp={formatRecordedTime(fa.timestamp)}
            />
          ))}
        </section>
      )}

      {/* Active Drawer Forms (Shown Only When Requested) */}
      {drawer === 'consume' && (
        <form onSubmit={handleLogMeal} className="tc-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--tc-text)]">Record Consumed Meal</h2>
            <button type="button" onClick={() => setDrawer('none')} className="text-xs text-[var(--tc-text-muted)] hover:underline">
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="consume-item" className="block text-xs text-[var(--tc-text-muted)]">Food Item</label>
              <select
                id="consume-item"
                value={consumeForm.food_item_uid}
                onChange={(e) => setConsumeForm({ ...consumeForm, food_item_uid: e.target.value })}
                className="tc-input w-full px-3 py-2 text-xs"
              >
                {items.map((it) => (
                  <option key={it.item_uid} value={it.item_uid}>
                    {it.name} ({it.quantity} {it.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="consume-meal" className="block text-xs text-[var(--tc-text-muted)]">Meal</label>
              <select
                id="consume-meal"
                value={consumeForm.meal_type}
                onChange={(e) => setConsumeForm({ ...consumeForm, meal_type: e.target.value })}
                className="tc-input w-full px-3 py-2 text-xs"
              >
                {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Hydration'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="consume-qty" className="block text-xs text-[var(--tc-text-muted)]">Portions &amp; Extra Water (ml)</label>
              <div className="flex gap-2">
                <input
                  id="consume-qty"
                  type="number"
                  step={0.5}
                  min={0.5}
                  value={consumeForm.quantity_consumed}
                  onChange={(e) => setConsumeForm({ ...consumeForm, quantity_consumed: Number(e.target.value) || 1 })}
                  className="tc-input w-1/2 px-2.5 py-2 text-xs tabular-data"
                />
                <input
                  aria-label="Extra water ml"
                  type="number"
                  step={50}
                  min={0}
                  value={consumeForm.extra_water_ml}
                  onChange={(e) => setConsumeForm({ ...consumeForm, extra_water_ml: Number(e.target.value) || 0 })}
                  className="tc-input w-1/2 px-2.5 py-2 text-xs tabular-data"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="tc-btn-primary px-5 py-2 text-xs">
              {busy ? 'Saving...' : 'Save Meal Record'}
            </button>
          </div>
        </form>
      )}

      {drawer === 'add' && (
        <form onSubmit={handleAddItem} className="tc-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--tc-text)]">Add Food Supply Item</h2>
            <button type="button" onClick={() => setDrawer('none')} className="text-xs text-[var(--tc-text-muted)] hover:underline">
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="add-food-name" className="block text-xs text-[var(--tc-text-muted)]">Food Name</label>
              <input
                id="add-food-name"
                required
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="e.g. Thermostabilized Lentil Stew"
                className="tc-input w-full px-3 py-2 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="add-food-cat" className="block text-xs text-[var(--tc-text-muted)]">Category</label>
              <select
                id="add-food-cat"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="tc-input w-full px-3 py-2 text-xs"
              >
                {FOOD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="add-food-qty" className="block text-xs text-[var(--tc-text-muted)]">Quantity &amp; Expiry Sol</label>
              <div className="flex gap-2">
                <input
                  id="add-food-qty"
                  type="number"
                  min={1}
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) || 1 })}
                  className="tc-input w-1/2 px-2.5 py-2 text-xs tabular-data"
                />
                <input
                  aria-label="Expiry Sol"
                  type="number"
                  min={1}
                  value={newItem.expiry_sol}
                  onChange={(e) => setNewItem({ ...newItem, expiry_sol: Number(e.target.value) || 300 })}
                  className="tc-input w-1/2 px-2.5 py-2 text-xs tabular-data"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="tc-btn-primary px-5 py-2 text-xs">
              {busy ? 'Adding...' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      )}

      {/* Inventory Table with Clean Filter Bar */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--tc-text)]">Galley Inventory</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter by food category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="tc-input px-3 py-1.5 text-xs"
            >
              <option value="ALL">All Categories</option>
              {FOOD_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Filter by inventory status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="tc-input px-3 py-1.5 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="RUNNING_LOW">Running Low</option>
              <option value="EXPIRING_SOON">Expiring Soon</option>
              <option value="CRITICAL">Critical</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={itemColumns}
          rows={filteredItems}
          rowKey={(r) => r.item_uid}
          initialSortKey="expiry"
          emptyTitle="No food items match these filters"
        />
      </section>

      {/* Progressive Disclosure: Daily Nutrition Monitoring */}
      <section className="tc-panel overflow-hidden">
        <button
          type="button"
          onClick={() => toggleDrawer('targets')}
          aria-expanded={drawer === 'targets'}
          className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[var(--tc-elevated)]/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Droplets className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold text-[var(--tc-text)]">
                Nutritional Intake &amp; Individual Crew Targets
              </div>
              <div className="text-xs text-[var(--tc-text-muted)]">
                {nutrition_overview.recorded.calories_kcal} / {nutrition_overview.targets.calories_target_kcal} kcal logged today ·{' '}
                {nutrition_overview.recorded.meals_logged_count} meal(s)
              </div>
            </div>
          </div>
          {drawer === 'targets' ? (
            <ChevronUp className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
          )}
        </button>

        {drawer === 'targets' && (
          <div className="px-6 pb-6 pt-3 border-t border-[var(--tc-border)] space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {[
                { label: 'Calories', val: nutrition_overview.recorded.calories_kcal, target: nutrition_overview.targets.calories_target_kcal, unit: 'kcal', pct: nutrition_overview.progress_pct.calories },
                { label: 'Protein', val: nutrition_overview.recorded.protein_g, target: nutrition_overview.targets.protein_target_g, unit: 'g', pct: nutrition_overview.progress_pct.protein },
                { label: 'Carbs', val: nutrition_overview.recorded.carbs_g, target: nutrition_overview.targets.carbs_target_g, unit: 'g', pct: nutrition_overview.progress_pct.carbs },
                { label: 'Fat', val: nutrition_overview.recorded.fat_g, target: nutrition_overview.targets.fat_target_g, unit: 'g', pct: nutrition_overview.progress_pct.fat },
                { label: 'Water', val: nutrition_overview.recorded.water_ml, target: nutrition_overview.targets.water_target_ml, unit: 'ml', pct: nutrition_overview.progress_pct.water },
              ].map((m) => (
                <div key={m.label} className="tc-panel-elevated p-3.5 space-y-2">
                  <div className="text-xs text-[var(--tc-text-muted)]">{m.label}</div>
                  <div className="tabular-data text-sm font-semibold text-[var(--tc-text)]">
                    {Math.round(m.val)} / {m.target} {m.unit}
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--tc-bg)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--tc-accent)]"
                      style={{ width: `${Math.min(100, m.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {nutrition_overview.explanations.length > 0 && (
              <ul className="space-y-1 text-xs text-[var(--tc-text-secondary)]">
                {nutrition_overview.explanations.map((ex, i) => (
                  <li key={i}>· {ex}</li>
                ))}
              </ul>
            )}

            <form onSubmit={handleSaveTargets} className="pt-4 border-t border-[var(--tc-border)] space-y-3">
              <div className="text-xs font-medium text-[var(--tc-text)]">
                Configure Personal Nutrition Targets ({state.astronaut.name})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { k: 'calories_target_kcal', label: 'Calories (kcal)' },
                  { k: 'protein_target_g', label: 'Protein (g)' },
                  { k: 'carbs_target_g', label: 'Carbs (g)' },
                  { k: 'fat_target_g', label: 'Fat (g)' },
                  { k: 'water_target_ml', label: 'Water (ml)' },
                ].map((f) => (
                  <div key={f.k} className="space-y-1">
                    <label htmlFor={`target-${f.k}`} className="block text-xs text-[var(--tc-text-muted)]">
                      {f.label}
                    </label>
                    <input
                      id={`target-${f.k}`}
                      type="number"
                      value={(targetForm as Record<string, any>)[f.k]}
                      onChange={(e) => setTargetForm((p) => ({ ...p, [f.k]: Number(e.target.value) || 0 }))}
                      className="tc-input w-full px-2.5 py-1.5 text-xs tabular-data"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[var(--tc-text-muted)]">
                  {nutrition_overview.safety_disclaimer}
                </span>
                <button type="submit" disabled={busy} className="tc-btn-secondary px-4 py-1.5 text-xs">
                  Save Crew Targets
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Progressive Disclosure: Supply Projections & Calculator */}
      <section className="tc-panel overflow-hidden">
        <button
          type="button"
          onClick={() => toggleDrawer('calculator')}
          aria-expanded={drawer === 'calculator'}
          className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[var(--tc-elevated)]/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Calculator className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold text-[var(--tc-text)]">
                Category Supply Projections &amp; Duration Calculator
              </div>
              <div className="text-xs text-[var(--tc-text-muted)]">
                Estimates by food category (projections, not guaranteed endurance) · {consumption_history.length} recent meal logs
              </div>
            </div>
          </div>
          {drawer === 'calculator' ? (
            <ChevronUp className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--tc-text-muted)]" aria-hidden="true" />
          )}
        </button>

        {drawer === 'calculator' && (
          <div className="px-6 pb-6 pt-3 border-t border-[var(--tc-border)] space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {category_projections.map((cp) => (
                <div key={cp.category} className="tc-panel-elevated p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--tc-text)]">{cp.category}</span>
                    <StatusIndicator status={cp.status} />
                  </div>
                  <div className="tabular-data text-lg font-semibold text-[var(--tc-text)]">
                    ~{cp.estimated_remaining_days} days est.
                  </div>
                  <div className="text-xs text-[var(--tc-text-muted)] tabular-data">
                    {cp.available_quantity} {cp.unit} · Depletes Sol {cp.projected_depletion_sol}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleCalculateProjection} className="pt-4 border-t border-[var(--tc-border)] space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--tc-text)]">
                <PackagePlus className="w-4 h-4 text-[var(--tc-accent)]" aria-hidden="true" />
                <span>Scenario Ration Estimator (Projection Only)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor="calc-portions" className="block text-xs text-[var(--tc-text-muted)]">Portions Remaining</label>
                  <input
                    id="calc-portions"
                    type="number"
                    value={calcInput.total_portions}
                    onChange={(e) => setCalcInput((p) => ({ ...p, total_portions: Number(e.target.value) || 0 }))}
                    className="tc-input w-full px-3 py-1.5 text-xs tabular-data"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="calc-crew" className="block text-xs text-[var(--tc-text-muted)]">Astronaut Count</label>
                  <input
                    id="calc-crew"
                    type="number"
                    min={1}
                    value={calcInput.astronaut_count}
                    onChange={(e) => setCalcInput((p) => ({ ...p, astronaut_count: Number(e.target.value) || 1 }))}
                    className="tc-input w-full px-3 py-1.5 text-xs tabular-data"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="calc-rate" className="block text-xs text-[var(--tc-text-muted)]">Portions / Crew / Day</label>
                  <input
                    id="calc-rate"
                    type="number"
                    step={0.5}
                    min={0.5}
                    value={calcInput.portions_per_astronaut_per_day}
                    onChange={(e) => setCalcInput((p) => ({ ...p, portions_per_astronaut_per_day: Number(e.target.value) || 1 }))}
                    className="tc-input w-full px-3 py-1.5 text-xs tabular-data"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="submit" disabled={busy} className="tc-btn-secondary px-4 py-1.5 text-xs">
                  Calculate Estimate
                </button>
                {calcResult && (
                  <div className="text-xs text-[var(--tc-text)] tabular-data">
                    Estimated ~{calcResult.estimated_remaining_days} days remaining (Projected depletion Sol {calcResult.projected_depletion_sol}).
                  </div>
                )}
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
};
