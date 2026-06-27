import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, RefreshCw, Tag, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/shared/Header'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listConfigs, createConfig, updateConfig, deleteConfig,
} from '@/services/configService'
import { ALGORITHMS, IDENTIFIER_TYPES, USER_TIERS } from '@/constants'
import type { RateLimitConfig, ConfigCreateRequest, Algorithm, IdentifierType, UserTier } from '@/types'

const EMPTY_FORM: ConfigCreateRequest = {
  identifier_type: 'user_id',
  identifier: '*',
  algorithm: 'sliding_window',
  limit: 100,
  window_seconds: 60,
  burst_capacity: 0,
  refill_rate: 0,
  user_tier: null,
  endpoint: null,
  enabled: true,
  tags: [],
}

export function Configurations() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<RateLimitConfig | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState<ConfigCreateRequest>(EMPTY_FORM)
  const [tagInput, setTagInput] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['configs'],
    queryFn: listConfigs,
  })

  const createMut = useMutation({
    mutationFn: createConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configs'] })
      toast.success('Config created')
      setCreating(false)
      setForm(EMPTY_FORM)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfigCreateRequest }) =>
      updateConfig(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configs'] })
      toast.success('Config updated')
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configs'] })
      toast.success('Config deleted')
      setDeleting(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openEdit = (c: RateLimitConfig) => {
    setEditing(c)
    setForm({
      identifier_type: c.identifier_type as IdentifierType,
      identifier: c.identifier,
      algorithm: c.algorithm as Algorithm,
      limit: c.limit,
      window_seconds: c.window_seconds,
      burst_capacity: c.burst_capacity,
      refill_rate: c.refill_rate,
      user_tier: c.user_tier as UserTier | null,
      endpoint: c.endpoint,
      enabled: c.enabled,
      tags: c.tags,
    })
  }

  const handleSubmit = () => {
    if (editing) {
      updateMut.mutate({ id: editing.id, data: form })
    } else {
      createMut.mutate(form)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !form.tags?.includes(tagInput.trim())) {
      setForm((f) => ({ ...f, tags: [...(f.tags || []), tagInput.trim()] }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags?.filter((t) => t !== tag) || [] }))
  }

  const isLoading_ = createMut.isPending || updateMut.isPending

  return (
    <div className="flex flex-col h-full">
      <Header title="Configurations" subtitle="Manage rate limit rules — changes take effect immediately" />

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {data?.total ?? 0} active rule{data?.total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button size="sm" onClick={() => { setCreating(true); setEditing(null); setForm(EMPTY_FORM) }}>
              <Plus className="w-4 h-4" /> New Rule
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Algorithm</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : data?.configs.length ? (
                    data.configs.map((c) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-border transition-colors hover:bg-muted/20"
                      >
                        <TableCell>
                          <div>
                            <p className="font-mono text-xs font-semibold text-foreground">
                              {c.identifier === '*' ? '* (all)' : c.identifier}
                            </p>
                            <p className="text-xs text-muted-foreground">{c.identifier_type}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {c.algorithm.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold">{c.limit}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{c.window_seconds}s</TableCell>
                        <TableCell>
                          {c.user_tier ? (
                            <Badge variant={c.user_tier === 'enterprise' ? 'default' : c.user_tier === 'premium' ? 'warning' : 'secondary'}>
                              {c.user_tier}
                            </Badge>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {c.endpoint || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {c.tags.slice(0, 2).map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {t}
                              </span>
                            ))}
                            {c.tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{c.tags.length - 2}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.enabled ? 'enabled' : 'disabled'} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="hover:text-destructive"
                              onClick={() => setDeleting(c.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Settings2 className="w-8 h-8 text-muted-foreground/40" />
                          <p className="text-muted-foreground text-sm">No configurations yet</p>
                          <Button size="sm" onClick={() => setCreating(true)}>
                            <Plus className="w-4 h-4" /> Create your first rule
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={creating || !!editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Rate Limit Rule' : 'Create Rate Limit Rule'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Changes take effect immediately without restart.' : 'Add a new rate limiting rule. It takes effect immediately.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Identifier Type</Label>
              <Select value={form.identifier_type} onValueChange={(v) => setForm((f) => ({ ...f, identifier_type: v as IdentifierType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IDENTIFIER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Identifier <span className="text-muted-foreground text-xs">(* = all)</span></Label>
              <Input value={form.identifier} onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Algorithm</Label>
              <Select value={form.algorithm} onValueChange={(v) => setForm((f) => ({ ...f, algorithm: v as Algorithm }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALGORITHMS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>User Tier</Label>
              <Select value={form.user_tier || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, user_tier: v === 'none' ? null : v as UserTier }))}>
                <SelectTrigger><SelectValue placeholder="No tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tier</SelectItem>
                  {USER_TIERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Limit (requests)</Label>
              <Input type="number" min={1} value={form.limit} onChange={(e) => setForm((f) => ({ ...f, limit: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Window (seconds)</Label>
              <Input type="number" min={1} value={form.window_seconds} onChange={(e) => setForm((f) => ({ ...f, window_seconds: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Burst Capacity <span className="text-muted-foreground text-xs">(token bucket)</span></Label>
              <Input type="number" min={0} value={form.burst_capacity} onChange={(e) => setForm((f) => ({ ...f, burst_capacity: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Refill Rate <span className="text-muted-foreground text-xs">(tokens/s)</span></Label>
              <Input type="number" min={0} step={0.1} value={form.refill_rate} onChange={(e) => setForm((f) => ({ ...f, refill_rate: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Endpoint <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={form.endpoint || ''} onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value || null }))} placeholder="/api/v1/search" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  <Tag className="w-4 h-4" />
                </Button>
              </div>
              {form.tags?.length ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.map((t) => (
                    <button key={t} onClick={() => removeTag(t)} className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors">
                      {t} ×
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
              <Label>Rule enabled</Label>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => { setCreating(false); setEditing(null) }}>Cancel</Button>
            <Button onClick={handleSubmit} loading={isLoading_}>
              {editing ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete Rule"
        description="This rule will be permanently removed. Rate limiting for affected identifiers will fall back to defaults."
        confirmLabel="Delete Rule"
        onConfirm={() => deleting && deleteMut.mutate(deleting)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
