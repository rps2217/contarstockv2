"use client";
/**
 * Expression DSL - Motor de Expresiones Declarativas
 * 
 * Inspirado en AppSheet Expressions.
 * Permite definir reglas de negocio con expresiones legibles.
 * 
 * Ejemplo de uso:
 * const rule = createRule({
 *   name: 'Stock bajo',
 *   condition: 'stock < minStock',
 *   action: 'notify',
 * });
 */

import { Product } from '@/types';
import { UserRole } from '@/stores';

// =============================================================================
// TIPOS BASE
// =============================================================================

export type ExpressionValue = string | number | boolean | null | undefined | Date;
export type ExpressionContext = Record<string, ExpressionValue>;

/**
 * Nodo AST del parser
 */
export type ASTNode = 
  | { type: 'literal'; value: ExpressionValue }
  | { type: 'field'; name: string }
  | { type: 'binary'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; operator: string; operand: ASTNode }
  | { type: 'function'; name: string; args: ASTNode[] };

// =============================================================================
// TOKENS Y LEXER
// =============================================================================

type TokenType = 
  | 'NUMBER' | 'STRING' | 'BOOLEAN' | 'NULL'
  | 'FIELD' | 'OPERATOR' | 'LPAREN' | 'RPAREN'
  | 'AND' | 'OR' | 'NOT' | 'IN' | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean | null;
}

const OPERATORS = ['+', '-', '*', '/', '=', '!=', '<>', '<', '>', '<=', '>=', '&&', '||', '!'];
const KEYWORDS: Record<string, TokenType> = {
  'and': 'AND', 'or': 'OR', 'not': 'NOT', 'in': 'IN',
  'true': 'BOOLEAN', 'false': 'BOOLEAN', 'null': 'NULL',
};

/**
 * Tokenizador simple
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  const chars = expression.trim();

  while (pos < chars.length) {
    const char = chars[pos];

    // Espacios
    if (/\s/.test(char)) {
      pos++;
      continue;
    }

    // Números
    if (/\d/.test(char) || (char === '.' && /\d/.test(chars[pos + 1]))) {
      let num = '';
      while (pos < chars.length && /[\d.]/.test(chars[pos])) {
        num += chars[pos++];
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(num) });
      continue;
    }

    // Strings
    if (char === '"' || char === "'") {
      const quote = char;
      let str = '';
      pos++;
      while (pos < chars.length && chars[pos] !== quote) {
        if (chars[pos] === '\\' && pos + 1 < chars.length) {
          pos++;
        }
        str += chars[pos++];
      }
      pos++; // closing quote
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Identifiers y keywords
    if (/[a-zA-Z_$]/.test(char)) {
      let ident = '';
      while (pos < chars.length && /[a-zA-Z0-9_$]/.test(chars[pos])) {
        ident += chars[pos++];
      }
      const upper = ident.toLowerCase();
      if (KEYWORDS[upper]) {
        tokens.push({ type: KEYWORDS[upper], value: upper === 'true' ? true : upper === 'false' ? false : null });
      } else {
        tokens.push({ type: 'FIELD', value: ident });
      }
      continue;
    }

    // Operadores
    let found = false;
    for (const op of OPERATORS.sort((a, b) => b.length - a.length)) {
      if (chars.slice(pos, pos + op.length) === op) {
        tokens.push({ type: 'OPERATOR', value: op });
        pos += op.length;
        found = true;
        break;
      }
    }
    if (found) continue;

    // Símbolos
    if (char === '(') { tokens.push({ type: 'LPAREN', value: char }); pos++; continue; }
    if (char === ')') { tokens.push({ type: 'RPAREN', value: char }); pos++; continue; }

    // Caracter inesperado
    throw new Error(`Token inesperado: ${char}`);
  }

  tokens.push({ type: 'EOF', value: null });
  return tokens;
}

// =============================================================================
// PARSER (Top-Down Recursive Descent)
// =============================================================================

class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: null };
  }

  private consume(type?: TokenType): Token {
    const token = this.current();
    if (type && token.type !== type) {
      throw new Error(`Se esperaba ${type}, got ${token.type}`);
    }
    this.pos++;
    return token;
  }

  parse(): ASTNode {
    return this.parseOr();
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.current().type === 'OR' || this.current().value === '||') {
      const op = String(this.consume().value);
      const right = this.parseAnd();
      left = { type: 'binary', operator: op, left, right };
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseNot();
    while (this.current().type === 'AND' || this.current().value === '&&') {
      const op = String(this.consume().value);
      const right = this.parseNot();
      left = { type: 'binary', operator: op, left, right };
    }
    return left;
  }

  private parseNot(): ASTNode {
    if (this.current().type === 'NOT' || this.current().value === '!') {
      this.consume();
      return { type: 'unary', operator: '!', operand: this.parseNot() };
    }
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddSub();
    const compOps = ['=', '!=', '<>', '<', '>', '<=', '>='];
    while (compOps.includes(String(this.current().value))) {
      const op = String(this.consume().value);
      const right = this.parseAddSub();
      left = { type: 'binary', operator: op, left, right };
    }
    return left;
  }

  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();
    while (this.current().value === '+' || this.current().value === '-') {
      const op = String(this.consume().value);
      const right = this.parseMulDiv();
      left = { type: 'binary', operator: op, left, right };
    }
    return left;
  }

  private parseMulDiv(): ASTNode {
    let left = this.parseUnary();
    while (this.current().value === '*' || this.current().value === '/') {
      const op = String(this.consume().value);
      const right = this.parseUnary();
      left = { type: 'binary', operator: op, left, right };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.current().value === '-') {
      this.consume();
      return { type: 'unary', operator: '-', operand: this.parsePrimary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.current();

    if (token.type === 'NUMBER') {
      this.consume();
      return { type: 'literal', value: token.value };
    }
    if (token.type === 'STRING') {
      this.consume();
      return { type: 'literal', value: token.value };
    }
    if (token.type === 'BOOLEAN') {
      this.consume();
      return { type: 'literal', value: token.value };
    }
    if (token.type === 'NULL') {
      this.consume();
      return { type: 'literal', value: null };
    }
    if (token.type === 'FIELD') {
      this.consume();
      const name = String(token.value);
      // ¿Función?
      if (this.current().type === 'LPAREN') {
        this.consume();
        const args: ASTNode[] = [];
        if (this.current().type !== 'RPAREN') {
          args.push(this.parseOr());
          while (this.current().type === 'OPERATOR' && this.current().value === ',') {
            this.consume();
            args.push(this.parseOr());
          }
        }
        this.consume('RPAREN');
        return { type: 'function', name, args };
      }
      return { type: 'field', name };
    }
    if (token.type === 'LPAREN') {
      this.consume();
      const expr = this.parseOr();
      this.consume('RPAREN');
      return expr;
    }

    throw new Error(`Token inesperado: ${token.type}`);
  }
}

// =============================================================================
// EVALUADOR
// =============================================================================

const FUNCTIONS: Record<string, (...args: any[]) => any> = {
  // Fecha
  now: () => new Date(),
  today: () => new Date(),
  year: (d: Date) => d.getFullYear(),
  month: (d: Date) => d.getMonth() + 1,
  day: (d: Date) => d.getDate(),
  diffDays: (a: Date | string, b: Date | string) => {
    const dateA = typeof a === 'string' ? new Date(a) : a;
    const dateB = typeof b === 'string' ? new Date(b) : b;
    return Math.ceil((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24));
  },
  
  // Texto
  upper: (s: string) => String(s).toUpperCase(),
  lower: (s: string) => String(s).toLowerCase(),
  trim: (s: string) => String(s).trim(),
  contains: (s: string, sub: string) => String(s).includes(sub),
  startsWith: (s: string, prefix: string) => String(s).startsWith(prefix),
  endsWith: (s: string, suffix: string) => String(s).endsWith(suffix),
  
  // Números
  abs: (n: number) => Math.abs(Number(n)),
  min: (...args: number[]) => Math.min(...args),
  max: (...args: number[]) => Math.max(...args),
  round: (n: number, decimals = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(Number(n) * factor) / factor;
  },
  
  // Lógicos
  if: (cond: boolean, trueVal: any, falseVal: any) => cond ? trueVal : falseVal,
  switch: (cond: boolean, ...cases: [boolean, any][]) => {
    for (const [c, val] of cases) {
      if (c) return val;
    }
    return null;
  },
  coalesce: (...args: any[]) => args.find(a => a != null),
};

/**
 * Evalúa un AST con un contexto
 */
function evaluate(node: ASTNode, context: ExpressionContext): ExpressionValue {
  switch (node.type) {
    case 'literal':
      return node.value;
    
    case 'field': {
      const value = context[node.name];
      // Convert strings to numbers if possible
      if (typeof value === 'string' && !isNaN(Number(value)) && value !== '') {
        return Number(value);
      }
      return value;
    }
    
    case 'binary': {
      const left = evaluate(node.left, context);
      const right = evaluate(node.right, context);
      const op = node.operator;
      
      switch (op) {
        case '=': case '==': return left === right;
        case '!=': case '<>': return left !== right;
        case '>': return Number(left) > Number(right);
        case '<': return Number(left) < Number(right);
        case '>=': return Number(left) >= Number(right);
        case '<=': return Number(left) <= Number(right);
        case '+': return Number(left) + Number(right);
        case '-': return Number(left) - Number(right);
        case '*': return Number(left) * Number(right);
        case '/': return Number(left) / Number(right);
        case '&&': case 'and': return Boolean(left) && Boolean(right);
        case '||': case 'or': return Boolean(left) || Boolean(right);
        default: throw new Error(`Operador desconocido: ${op}`);
      }
    }
    
    case 'unary': {
      const operand = evaluate(node.operand, context);
      switch (node.operator) {
        case '!': case 'not': return !operand;
        case '-': return -Number(operand);
        default: throw new Error(`Operador unario desconocido: ${node.operator}`);
      }
    }
    
    case 'function': {
      const args = node.args.map(arg => evaluate(arg, context));
      const fn = FUNCTIONS[node.name.toLowerCase()];
      if (!fn) throw new Error(`Función desconocida: ${node.name}`);
      return fn(...args);
    }
  }
}

// =============================================================================
// API PRINCIPAL
// =============================================================================

/**
 * Compila una expresión a función
 */
export function compileExpression(expression: string): (context: ExpressionContext) => ExpressionValue {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  
  return (context: ExpressionContext) => evaluate(ast, context);
}

/**
 * Evalúa una expresión directamente
 */
export function evaluateExpression(expression: string, context: ExpressionContext): ExpressionValue {
  const fn = compileExpression(expression);
  return fn(context);
}

/**
 * Valida sintaxis de una expresión
 */
export function validateExpression(expression: string): { valid: boolean; error?: string } {
  try {
    compileExpression(expression);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Error desconocido' };
  }
}

// =============================================================================
// REGLAS DE NEGOCIO
// =============================================================================

export type RuleSeverity = 'info' | 'warning' | 'error' | 'critical';
export type RuleAction = 'notify' | 'block' | 'log' | 'suggest';

export interface BusinessRule<T = any> {
  /** ID único */
  id: string;
  /** Nombre legible */
  name: string;
  /** Descripción */
  description?: string;
  /** Expresión condicional */
  condition: string;
  /** Mensaje cuando se cumple */
  message: string;
  /** Severidad */
  severity: RuleSeverity;
  /** Acción a tomar */
  action: RuleAction;
  /** Módulo/dominio */
  domain?: string;
  /** Si está activa */
  enabled?: boolean;
  /** Campos involucrados */
  fields?: string[];
}

/**
 * Resultado de evaluar una regla
 */
export interface RuleResult {
  rule: BusinessRule;
  passed: boolean;
  message: string;
  severity: RuleSeverity;
}

/**
 * Evalúa un registro contra una regla
 */
export function evaluateRule<T extends Record<string, any>>(
  record: T,
  rule: BusinessRule,
  extraContext?: Record<string, any>
): RuleResult {
  if (!rule.enabled) {
    return { rule, passed: true, message: '', severity: 'info' };
  }

  try {
    const context = { ...record, ...extraContext };
    const passed = Boolean(evaluateExpression(rule.condition, context));

    return {
      rule,
      passed,
      message: passed ? rule.message : '',
      severity: passed ? rule.severity : 'info',
    };
  } catch (err) {
    return {
      rule,
      passed: false,
      message: `Error en evaluación: ${err instanceof Error ? err.message : 'desconocido'}`,
      severity: 'error',
    };
  }
}

/**
 * Evalúa múltiples reglas contra un registro
 */
export function evaluateRules<T extends Record<string, any>>(
  record: T,
  rules: BusinessRule[],
  extraContext?: Record<string, any>
): RuleResult[] {
  return rules
    .filter(r => r.enabled !== false)
    .map(rule => evaluateRule(record, rule, extraContext))
    .filter(result => result.passed);
}

/**
 * Obtiene la severidad máxima de un conjunto de resultados
 */
export function getMaxSeverity(results: RuleResult[]): RuleSeverity {
  const priority: Record<RuleSeverity, number> = {
    info: 0,
    warning: 1,
    error: 2,
    critical: 3,
  };
  
  return results.reduce((max, r) => 
    priority[r.severity] > priority[max] ? r.severity : max
  , 'info' as RuleSeverity);
}

// =============================================================================
// REGLAS PREDEFINIDAS
// =============================================================================

/**
 * Reglas predefinidas para inventario
 */
export const INVENTORY_RULES: BusinessRule[] = [
  {
    id: 'stock-critical',
    name: 'Stock crítico',
    description: 'Activa cuando el stock está por debajo del mínimo',
    condition: 'stock < minStock and minStock > 0',
    message: '⚠️ Stock por debajo del mínimo',
    severity: 'error',
    action: 'notify',
    domain: 'inventory',
    fields: ['stock', 'minStock'],
  },
  {
    id: 'stock-warning',
    name: 'Stock bajo',
    description: 'Activa cuando el stock está próximo al mínimo',
    condition: 'stock >= minStock and stock < (minStock * 1.5)',
    message: '📦 Stock próximo al mínimo',
    severity: 'warning',
    action: 'suggest',
    domain: 'inventory',
    fields: ['stock', 'minStock'],
  },
  {
    id: 'out-of-stock',
    name: 'Sin stock',
    description: 'Activa cuando no hay stock disponible',
    condition: 'stock <= 0',
    message: '🚫 Producto sin stock',
    severity: 'critical',
    action: 'notify',
    domain: 'inventory',
    fields: ['stock'],
  },
  {
    id: 'expiry-warning',
    name: 'Próximo a vencer',
    description: 'Activa cuando quedan 30 días o menos',
    condition: 'diffDays(expiryDate, today()) <= 30 and diffDays(expiryDate, today()) >= 0',
    message: '⏰ Producto próximo a vencer',
    severity: 'warning',
    action: 'notify',
    domain: 'expiry',
    fields: ['expiryDate'],
  },
  {
    id: 'expiry-critical',
    name: 'Vencido o por vencer',
    description: 'Activa cuando está vencido o vence en 7 días',
    condition: 'diffDays(expiryDate, today()) <= 7',
    message: '⚠️ Producto vencido o por vencer',
    severity: 'critical',
    action: 'notify',
    domain: 'expiry',
    fields: ['expiryDate'],
  },
  {
    id: 'price-missing',
    name: 'Precio faltante',
    description: 'Activa cuando no hay precio definido',
    condition: 'price is null or price = 0',
    message: '💰 Producto sin precio definido',
    severity: 'warning',
    action: 'suggest',
    domain: 'inventory',
    fields: ['price'],
  },
  {
    id: 'supplier-missing',
    name: 'Sin proveedor',
    description: 'Activa cuando no hay proveedor asociado',
    condition: 'supplier is null and supplierRut is null',
    message: '🏭 Producto sin proveedor',
    severity: 'info',
    action: 'log',
    domain: 'inventory',
    fields: ['supplier', 'supplierRut'],
  },
];

// =============================================================================
// HOOK PARA REACT
// =============================================================================

import { useMemo } from 'react';

/**
 * Hook para evaluar reglas contra un registro
 */
export function useBusinessRules<T extends Record<string, any>>(
  record: T | undefined,
  rules: BusinessRule[] = INVENTORY_RULES,
  extraContext?: Record<string, any>
) {
  return useMemo(() => {
    if (!record) return { results: [], maxSeverity: 'info' as RuleSeverity };
    
    const results = evaluateRules(record, rules, extraContext);
    const maxSeverity = getMaxSeverity(results);
    
    return { results, maxSeverity };
  }, [record, rules, extraContext]);
}

/**
 * Hook para validar un campo con reglas
 */
export function useFieldValidation<T extends Record<string, any>>(
  record: T,
  fieldName: string,
  rules?: BusinessRule[]
) {
  return useMemo(() => {
    const filteredRules = (rules || INVENTORY_RULES)
      .filter(r => r.fields?.includes(fieldName));
    
    const results = evaluateRules(record, filteredRules);
    
    return {
      isValid: !results.some(r => r.severity === 'error' || r.severity === 'critical'),
      errors: results.filter(r => r.severity === 'error' || r.severity === 'critical'),
      warnings: results.filter(r => r.severity === 'warning'),
      info: results.filter(r => r.severity === 'info'),
    };
  }, [record, fieldName, rules]);
}
