'use client';
/**
 * Workflow Engine - Motor de AutomatizacionesBasado en Eventos
 *
 * Inspirado en AppSheet Automation (Bots).
 * Permite definir flujos automáticos: Cuando X ocurre → Hacer Y.
 *
 * Ejemplo de uso:
 * const workflow = createWorkflow({
 *   name: 'Notificar stock bajo',
 *   trigger: { type: 'product.updated', field: 'stock' },
 *   conditions: ['stock < minStock'],
 *   actions: [{ type: 'notify', message: 'Stock bajo en {{name}}' }]
 * });
 */

import { Product } from '@/types';
import { logger } from '@/services/logger';
import { useToastStore } from '@/stores';
import { evaluateExpression } from './expressionEngine';
import type { BusinessRule } from './expressionEngine';

// =============================================================================
// TIPOS
// =============================================================================

/** Tipo base para registros de workflow (puede ser cualquier entidad) */
export type WorkflowRecord = Record<string, unknown>;

/** Tipo para el valor a actualizar (puede ser cualquier tipo serializable) */
export type WorkflowValue = string | number | boolean | null | unknown[] | Record<string, unknown>;

export type WorkflowTriggerType =
  | 'created' // Cuando se crea un registro
  | 'updated' // Cuando se actualiza un registro
  | 'deleted' // Cuando se elimina un registro
  | 'condition' // Cuando una condición se cumple (scheduled)
  | 'manual'; // Ejecución manual

export type WorkflowActionType =
  | 'notify' // Mostrar notificación
  | 'email' // Enviar email (placeholder)
  | 'create_task' // Crear tarea
  | 'update_field' // Actualizar campo
  | 'log' // Registrar en log
  | 'webhook' // Llamar webhook
  | 'audit'; // Registrar en auditoría

export interface WorkflowTrigger {
  /** Tipo de evento */
  type: WorkflowTriggerType;
  /** Tabla/colección */
  table: string;
  /** Campo específico (opcional) */
  field?: string;
  /** Función condition checker (para triggers condition) */
  conditionFn?: (record: WorkflowRecord) => boolean;
}

export interface WorkflowAction {
  /** Tipo de acción */
  type: WorkflowActionType;
  /** Mensaje o template */
  message?: string;
  /** Campo a actualizar (para update_field) */
  updateField?: string;
  /** Valor a asignar (para update_field) */
  updateValue?: WorkflowValue;
  /** URL para webhooks */
  webhookUrl?: string;
  /** Prioridad (para notificaciones) */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  /** Destinatario (para email/tasks) */
  recipient?: string;
}

export interface WorkflowCondition {
  /** Expresión a evaluar */
  expression: string;
  /** Descripción */
  description?: string;
}

/**
 * Definición de un workflow
 */
export interface Workflow {
  /** ID único */
  id: string;
  /** Nombre legible */
  name: string;
  /** Descripción */
  description?: string;
  /** Si está activo */
  enabled: boolean;
  /** Prioridad de ejecución */
  priority: number;
  /** Trigger que inicia el workflow */
  trigger: WorkflowTrigger;
  /** Condiciones adicionales (AND) */
  conditions?: WorkflowCondition[];
  /** Acciones a ejecutar */
  actions: WorkflowAction[];
  /** Límite de ejecuciones (para rate limiting) */
  maxExecutions?: number;
  /** Intervalo mínimo entre ejecuciones (ms) */
  minInterval?: number;
}

/**
 * Resultado de una ejecución
 */
export interface WorkflowExecution {
  workflowId: string;
  timestamp: number;
  success: boolean;
  triggeredBy: string;
  conditionsMet: boolean;
  actionsExecuted: WorkflowAction[];
  errors?: string[];
  duration: number;
}

/**
 * Estado del workflow engine
 */
interface WorkflowEngineState {
  workflows: Workflow[];
  executions: WorkflowExecution[];
  lastExecution: Record<string, number>;
}

// =============================================================================
// REGISTRO DE WORKFLOWS
// =============================================================================

let workflows: Workflow[] = [];
let executions: WorkflowExecution[] = [];
let lastExecution: Record<string, number> = {};

const MAX_EXECUTIONS = 1000;

/**
 * Registra un workflow
 */
export function registerWorkflow(workflow: Workflow): void {
  const existing = workflows.findIndex(w => w.id === workflow.id);
  if (existing >= 0) {
    workflows[existing] = workflow;
  } else {
    workflows.push(workflow);
  }
}

/**
 * Elimina un workflow
 */
export function unregisterWorkflow(id: string): void {
  workflows = workflows.filter(w => w.id !== id);
}

/**
 * Obtiene todos los workflows
 */
export function getWorkflows(): Workflow[] {
  return [...workflows];
}

/**
 * Obtiene workflows activos
 */
export function getActiveWorkflows(): Workflow[] {
  return workflows.filter(w => w.enabled);
}

/**
 * Activa/desactiva un workflow
 */
export function setWorkflowEnabled(id: string, enabled: boolean): void {
  const workflow = workflows.find(w => w.id === id);
  if (workflow) {
    workflow.enabled = enabled;
  }
}

// =============================================================================
// EVALUACIÓN DE TRIGGERS
// =============================================================================

/**
 * Verifica si un registro cumple las condiciones del trigger
 */
function matchesTrigger(record: WorkflowRecord, trigger: WorkflowTrigger): boolean {
  // Trigger manual siempre coincide
  if (trigger.type === 'manual') return false; // Se ejecuta explícitamente

  // Trigger condition usa función custom
  if (trigger.type === 'condition' && trigger.conditionFn) {
    return trigger.conditionFn(record);
  }

  // Para otros triggers, verificar tabla
  // (la lógica de created/updated/deleted se maneja en quien llama)
  return true;
}

/**
 * Evalúa las condiciones de un workflow
 */
function evaluateConditions(
  record: WorkflowRecord,
  conditions: WorkflowCondition[] | undefined,
  context?: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every(cond => {
    try {
      const result = evaluateExpression(cond.expression, { ...record, ...context });
      return Boolean(result);
    } catch {
      return false;
    }
  });
}

// =============================================================================
// EJECUCIÓN DE ACCIONES
// =============================================================================

/**
 * Ejecuta una acción individual
 */
async function executeAction(
  action: WorkflowAction,
  record: WorkflowRecord,
  context?: Record<string, any>
): Promise<void> {
  // Template substitution para mensajes
  const template = action.message || '';
  const renderedMessage = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return context?.[key] !== undefined
      ? String(context[key])
      : record[key] !== undefined
        ? String(record[key])
        : `{{${key}}}`;
  });

  switch (action.type) {
    case 'notify':
      // Usar toast store
      if (typeof window !== 'undefined') {
        const toastStore = (window as any).__toastStore;
        if (toastStore) {
          const toastFn =
            action.priority === 'urgent'
              ? toastStore.error
              : action.priority === 'high'
                ? toastStore.warning
                : toastStore.success;
          toastFn(renderedMessage, { duration: 5000 });
        }
      }
      break;

    case 'log':
      logger.info('workflowEngine', 'Workflow Log', { message: renderedMessage, record, context });
      break;

    case 'audit':
      // Registrar en auditoría si está disponible
      if (typeof window !== 'undefined') {
        const auditStore = (window as any).__auditStore;
        if (auditStore) {
          auditStore.getState().addLog({
            action: 'workflow',
            tableName: 'workflows',
            recordId: record.id || record.barcode,
            details: renderedMessage,
            severity: action.priority === 'urgent' ? 'critical' : 'info',
          });
        }
      }
      break;

    case 'webhook':
      if (action.webhookUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          await fetch(action.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ record, context, message: renderedMessage }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            logger.warn('workflowEngine', 'Webhook timed out', { url: action.webhookUrl });
          } else {
            logger.error(
              'workflowEngine',
              'Webhook failed',
              err instanceof Error ? err.message : String(err)
            );
          }
        }
      }
      break;

    case 'email':
      logger.info('workflowEngine', 'Email action', {
        recipient: action.recipient,
        message: renderedMessage,
      });
      // Placeholder para implementación real
      break;

    case 'create_task':
      logger.info('workflowEngine', 'Task created', {
        message: renderedMessage,
        assignee: action.recipient,
      });
      // Placeholder para implementación real
      break;

    case 'update_field':
      if (action.updateField && record) {
        record[action.updateField] = action.updateValue;
      }
      break;
  }
}

// =============================================================================
// MOTOR DE EJECUCIÓN
// =============================================================================

/**
 * Ejecuta un workflow
 */
export async function executeWorkflow(
  workflow: Workflow,
  record: WorkflowRecord,
  context?: Record<string, any>
): Promise<WorkflowExecution> {
  const startTime = Date.now();
  const errors: string[] = [];
  const actionsExecuted: WorkflowAction[] = [];

  // Verificar rate limiting
  if (workflow.minInterval) {
    const last = lastExecution[workflow.id] || 0;
    if (Date.now() - last < workflow.minInterval) {
      return {
        workflowId: workflow.id,
        timestamp: Date.now(),
        success: false,
        triggeredBy: JSON.stringify(record),
        conditionsMet: false,
        actionsExecuted: [],
        errors: ['Rate limited'],
        duration: Date.now() - startTime,
      };
    }
  }

  // Verificar max executions
  if (workflow.maxExecutions) {
    const recentExecutions = executions.filter(e => e.workflowId === workflow.id).length;
    if (recentExecutions >= workflow.maxExecutions) {
      return {
        workflowId: workflow.id,
        timestamp: Date.now(),
        success: false,
        triggeredBy: JSON.stringify(record),
        conditionsMet: false,
        actionsExecuted: [],
        errors: ['Max executions reached'],
        duration: Date.now() - startTime,
      };
    }
  }

  // Evaluar condiciones
  const conditionsMet = evaluateConditions(record, workflow.conditions, context);

  if (!conditionsMet) {
    return {
      workflowId: workflow.id,
      timestamp: Date.now(),
      success: true,
      triggeredBy: JSON.stringify(record),
      conditionsMet: false,
      actionsExecuted: [],
      duration: Date.now() - startTime,
    };
  }

  // Ejecutar acciones
  for (const action of workflow.actions) {
    try {
      await executeAction(action, record, context);
      actionsExecuted.push(action);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // Registrar ejecución
  const execution: WorkflowExecution = {
    workflowId: workflow.id,
    timestamp: Date.now(),
    success: errors.length === 0,
    triggeredBy: JSON.stringify(record),
    conditionsMet: true,
    actionsExecuted,
    errors,
    duration: Date.now() - startTime,
  };

  // Agregar a historial
  executions.unshift(execution);
  if (executions.length > MAX_EXECUTIONS) {
    executions = executions.slice(0, MAX_EXECUTIONS);
  }
  lastExecution[workflow.id] = Date.now();

  return execution;
}

/**
 * Ejecuta todos los workflows activos que matchean el trigger
 */
export async function executeWorkflows(
  table: string,
  record: WorkflowRecord,
  triggerType: WorkflowTriggerType,
  context?: Record<string, any>
): Promise<WorkflowExecution[]> {
  const results: WorkflowExecution[] = [];

  const matchingWorkflows = workflows.filter(w => {
    if (!w.enabled) return false;
    if (w.trigger.table !== table) return false;
    if (w.trigger.type !== triggerType) return false;
    return matchesTrigger(record, w.trigger);
  });

  // Ordenar por prioridad
  matchingWorkflows.sort((a, b) => a.priority - b.priority);

  for (const workflow of matchingWorkflows) {
    const result = await executeWorkflow(workflow, record, context);
    results.push(result);
  }

  return results;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Crea un workflow de notificación de stock bajo
 */
export function createStockAlertWorkflow(): Workflow {
  return {
    id: 'stock-low-notify',
    name: 'Alertar stock bajo',
    description: 'Notifica cuando el stock está por debajo del mínimo',
    enabled: true,
    priority: 10,
    trigger: {
      type: 'updated',
      table: 'products',
      field: 'stock',
    },
    conditions: [
      {
        expression: 'stock < minStock and minStock > 0',
        description: 'Stock menor al mínimo',
      },
    ],
    actions: [
      {
        type: 'notify',
        message: '⚠️ Stock bajo: {{name}} tiene {{stock}} unidades (mín: {{minStock}})',
        priority: 'high',
      },
      {
        type: 'log',
        message: 'Stock bajo detectado en {{name}}',
      },
    ],
    minInterval: 60000, // 1 minuto entre alertas del mismo producto
  };
}

/**
 * Crea un workflow de notificación de vencimiento
 */
export function createExpiryAlertWorkflow(): Workflow {
  return {
    id: 'expiry-warning-notify',
    name: 'Alertar próximo vencimiento',
    description: 'Notifica 30 días antes del vencimiento',
    enabled: true,
    priority: 5,
    trigger: {
      type: 'updated',
      table: 'products',
      field: 'expiryDate',
    },
    conditions: [
      {
        expression: 'diffDays(expiryDate, today()) <= 30 and diffDays(expiryDate, today()) >= 0',
        description: 'Vence en 30 días o menos',
      },
    ],
    actions: [
      {
        type: 'notify',
        message: '⏰ {{name}} vence el {{expiryDate}}',
        priority: 'normal',
      },
    ],
    minInterval: 3600000, // 1 hora entre alertas
  };
}

/**
 * Inicializa workflows predefinidos
 */
export function initializeWorkflows(): void {
  registerWorkflow(createStockAlertWorkflow());
  registerWorkflow(createExpiryAlertWorkflow());
}

// =============================================================================
// HOOK PARA REACT
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
/**
 * Hook para usar el workflow engine
 */
export function useWorkflowEngine() {
  const [activeWorkflows, setActiveWorkflows] = useState<Workflow[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<WorkflowExecution[]>([]);

  // Inicializar workflows
  useEffect(() => {
    initializeWorkflows();
    setActiveWorkflows(getActiveWorkflows());
  }, []);

  // Refresh executions
  useEffect(() => {
    setRecentExecutions(executions.slice(0, 20));
  }, [executions.length]);

  // Ejecutar workflows manualmente
  const trigger = useCallback(
    async (
      table: string,
      record: WorkflowRecord,
      triggerType: WorkflowTriggerType = 'manual',
      context?: Record<string, any>
    ) => {
      const results = await executeWorkflows(table, record, triggerType, context);
      setRecentExecutions(executions.slice(0, 20));
      return results;
    },
    []
  );

  // Toggle workflow
  const toggle = useCallback((id: string, enabled: boolean) => {
    setWorkflowEnabled(id, enabled);
    setActiveWorkflows(getActiveWorkflows());
  }, []);

  return {
    workflows: activeWorkflows,
    executions: recentExecutions,
    trigger,
    toggle,
    register: registerWorkflow,
    unregister: unregisterWorkflow,
  };
}
