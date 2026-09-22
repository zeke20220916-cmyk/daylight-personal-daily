import { z } from 'zod';
const text = (max: number) => z.string().trim().min(1).max(max);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => {const t = Date.parse(d); return Number.isFinite(t) && new Date(t).toISOString().slice(0,10) === d;}, 'Invalid date');
const link = z.string().url().max(2000).refine(s => new URL(s).protocol === 'https:', 'HTTPS source required');
const source = z.object({ title: text(200), url: link }).strict();
const article = z.object({ title: text(150), summary: text(4000), sources: z.array(source).min(1).max(6), status: z.enum(['已核实','待确认','需盘中验证']) }).strict();
export const editionSchema = z.object({
  date: dateSchema, title: text(100), introduction: text(400), coveredSession: text(150),
  investment: z.array(article).max(3), news: z.array(article).max(5),
  book: z.object({ title: text(120), author: text(120), reason: text(1200), prompt: text(500), source }).strict(),
}).strict().refine(d => d.investment.length + d.news.length > 0, 'At least one sourced item required');
export type Edition = z.infer<typeof editionSchema> & { receivedAt: string };
export const recordSchema = z.discriminatedUnion('kind', [
  z.object({kind:z.literal('task'), id:z.string().uuid(), value:z.object({title:text(200), done:z.boolean(), date:dateSchema}).strict()}).strict(),
  z.object({kind:z.literal('book'), id:text(200), value:z.object({title:text(120), author:text(120), reason:text(1200), url:link}).strict()}).strict(),
  z.object({kind:z.literal('read'), id:dateSchema, value:z.object({read:z.literal(true)}).strict()}).strict(),
  z.object({kind:z.literal('word'), id:text(80), value:z.object({stage:z.number().int().min(0).max(6), next:dateSchema, reviewed:dateSchema}).strict()}).strict(),
  z.object({kind:z.literal('stock'), id:z.string().regex(/^[A-Za-z0-9.^=-]{1,20}$/), value:z.object({name:text(80)}).strict()}).strict(),
]);
export type RecordInput = z.infer<typeof recordSchema>;
export type SavedRecord = { kind: RecordInput['kind']; id:string; value: Record<string, unknown> };
export const beijingDate = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
