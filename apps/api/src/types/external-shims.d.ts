// Auto-generated ambient shims to keep the archive typecheckable without the full dependency tree.
declare class Buffer extends Uint8Array {
  static from(data: string | ArrayBufferLike | readonly number[] | Uint8Array, encoding?: string): Buffer;
  static byteLength(input: string, encoding?: string): number;
  static concat(list: readonly Uint8Array[], totalLength?: number): Buffer;
  static alloc(size: number, fill?: string | number | Uint8Array, encoding?: string): Buffer;
  toString(encoding?: string): string;
  subarray(start?: number, end?: number): Buffer;
}

declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
  uptime(): number;
  argv: string[];
  version: string;
  pid: number;
  exitCode?: number;
  hrtime: {
    bigint(): bigint;
    (time?: [number, number]): [number, number];
  };
  once(event: string, listener: (...args: any[]) => void): any;
  on(event: string, listener: (...args: any[]) => void): any;
  off(event: string, listener: (...args: any[]) => void): any;
  exit(code?: number): never;
};

declare interface ImportMeta {
  env: Record<string, string | undefined>;
  dirname: string;
}

// Minimal Node.js shims required by this archive when @types/node is unavailable.
declare namespace NodeJS {
  type Timeout = ReturnType<typeof setTimeout>;
  interface ErrnoException extends Error {
    code?: string;
    errno?: number;
    syscall?: string;
    path?: string;
  }
}

declare module "node:buffer" { export { Buffer }; }
declare module "node:crypto" {
  export type BinaryLike = string | ArrayBufferLike | Uint8Array;
  export type KeyObject = unknown;
  export function randomUUID(): string;
  export function randomBytes(size: number): Buffer;
  export function randomInt(min: number, max?: number): number;
  export function createHash(algorithm: string): { update(data: BinaryLike): any; digest(encoding?: string): string };
  export function createHmac(algorithm: string, key: BinaryLike): { update(data: BinaryLike): any; digest(encoding?: string): string };
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
  const crypto: any;
  export default crypto;
}

declare module "node:fs/promises" {
  const fs: any;
  export default fs;
  export const mkdir: any; export const readFile: any; export const writeFile: any; export const rename: any; export const unlink: any; export const open: any;
}
declare module "node:fs" { const fs: any; export default fs; export const existsSync: any; export const mkdirSync: any; export const readFileSync: any; export const writeFileSync: any; export const unlinkSync: any; export const statSync: any; }
declare module "fs" { const fs: any; export default fs; export const existsSync: any; export const mkdirSync: any; export const readFileSync: any; export const writeFileSync: any; export const unlinkSync: any; export const statSync: any; }
declare module "node:os" { const os: any; export default os; export const tmpdir: any; }
declare module "os" { const os: any; export default os; export const tmpdir: any; }
declare module "node:path" { const path: any; export default path; export const join: any; export const resolve: any; export const relative: any; export const dirname: any; export const posix: any; export const isAbsolute: any; }
declare module "path" { const path: any; export default path; export const join: any; export const resolve: any; export const relative: any; export const dirname: any; export const posix: any; export const isAbsolute: any; }
declare module "node:events" { export class EventEmitter { [key: string]: any; } }
declare module "node:http" { export class Server { [key: string]: any; } export function createServer(...args: any[]): Server; }
declare module "vite/client" { }

declare namespace JSX {
  interface IntrinsicElements { [elemName: string]: any }
  interface IntrinsicAttributes { [attr: string]: any }
  interface Element {}
}

declare namespace React {
  type ReactNode = any;
  type CSSProperties = Record<string, any>;
  type FC<P = any> = (props: P) => any;
}

declare module "react" {
  export type ReactNode = any;
  export type CSSProperties = Record<string, any>;
  export type FC<P = any> = (props: P) => any;
  export type ComponentType<P = any> = any;
  export type ElementType = any;
  export type ImgHTMLAttributes<T> = any;
  export type ComponentProps<T = any> = any;
  export class Component<P = any, S = any> {
    props: P;
    state: S;
    constructor(props: P);
    setState(state: Partial<S> | ((prev: S) => Partial<S>)): void;
    forceUpdate(): void;
  }
  export function createContext<T = any>(defaultValue: T): any;
  export function useContext<T = any>(ctx: any): T;
  export function useState<T = undefined>(): [T | undefined, (value: T | ((prev: T) => T)) => void];
  export function useState<T = any>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T = any>(factory: () => T, deps?: any[]): T;
  export function useRef<T = any>(initialValue: T | null): { current: T | null };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: any[]): T;
  export function useId(): string;
  export function lazy<T = any>(factory: () => Promise<{ default: T }>): T;
  export const Suspense: any;
  export const Fragment: any;
  export function memo<T = any>(component: T): T;
  const React: any;
  export default React;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module "react-dom/client" {
  export function createRoot(container: any): any;
}

declare module "react-hook-form" {
  export function useForm<T = any>(options?: any): any;
  export function useFormContext<T = any>(): any;
  export function useFormState<T = any>(props?: any): any;
  export function Controller(props: any): any;
  export function FormProvider(props: any): any;
  export type FieldValues = any;
  export type FieldPath<T = any> = any;
  export type ControllerProps<TFieldValues = any, TName = any> = any;
}

declare module "wouter" {
  export function useLocation(): [string, (value: string) => void];
  export function useNavigate(): (to: string) => void;
  export function useSearch(): URLSearchParams;
  export function useRoute<T = Record<string, string>>(path: string): [boolean, T];
  export function useParams<T = Record<string, string>>(): T;
  export const Link: any; export const Route: any; export const Switch: any; export const Redirect: any;
}

declare module "vite" {
  export interface Plugin {
    name?: string;
    transformIndexHtml?: (html: string, ctx?: any) => any;
    configureServer?: (server: any) => any;
  }
  export interface ViteDevServer {
    middlewares: any;
    transformIndexHtml(url: string, html: string): Promise<string>;
    ssrFixStacktrace(err: Error): void;
  }
  export function defineConfig(config: any): any;
  export function createServer(options?: any): Promise<ViteDevServer>;
}

declare module "http" {
  export class Server { [key: string]: any; }
  export function createServer(...args: any[]): Server;
}

declare module "node:http" {
  export class Server { [key: string]: any; }
  export function createServer(...args: any[]): Server;
}

declare module "express" {
  export interface Request {
    headers: Record<string, any> & { authorization?: string; cookie?: string; origin?: string; 'content-type'?: string; 'content-disposition'?: string; [key: string]: any };
    method: string;
    path: string;
    originalUrl: string;
    ip: string;
    body: any;
    query: any;
    params: any;
    route?: { path?: string } | any;
    file?: any;
    user?: any;
    on(event: string, listener: (...args: any[]) => void): any;
    get?(name: string): any;
  }
  export interface Response {
    statusCode: number;
    status(code: number): Response;
    json(body?: any): Response;
    send(body?: any): Response;
    end(body?: any): Response;
    set(name: string | Record<string, string>, value?: string): Response;
    setHeader(name: string, value: any): Response;
    cookie(name: string, value: string, options?: any): Response;
    clearCookie(name: string, options?: any): Response;
    redirect(url: string): Response;
    sendFile(path: string): Response;
    writeHead(statusCode: number, headers?: Record<string, string>): Response;
    on(event: string, listener: (...args: any[]) => void): any;
  }
  export type NextFunction = (err?: any) => void;
  export interface Express {
    use(...args: any[]): any;
    get(...args: any[]): any;
    post(...args: any[]): any;
    options(...args: any[]): any;
    disable(name: string): any;
    set(name: string, value: any): any;
    listen(...args: any[]): any;
  }
  export interface ExpressFactory {
    (): Express;
    json(options?: any): any;
    urlencoded(options?: any): any;
    static(path: string): any;
    Router(): Router;
  }
  export interface Router extends Express {}
  const express: ExpressFactory;
  export default express;
}

declare module "zod" {
  export namespace z {
    type infer<T> = any;
    type output<T> = any;
  }
  export const z: any;
}

declare module "@trpc/server" {
  export class TRPCError extends Error { constructor(opts: { code: string; message?: string }); }
  export const initTRPC: {
    context<T = any>(): { create(config?: any): { router: any; procedure: any; middleware(fn: any): any } };
  };
}

declare module "@trpc/server/adapters/express" {
  export type CreateExpressContextOptions = { req: import("express").Request; res: import("express").Response };
  export function createExpressMiddleware(options: any): any;
}

declare module "@trpc/react-query" {
  export function createTRPCReact<T = any>(): any;
}

declare module "@trpc/client" {
  export const TRPCClientError: any;
  export function httpBatchLink(options: any): any;
}

declare module "drizzle-orm" {
  export function relations(table: any, cb: (helpers: { one: any; many: any }) => any): any;
  export function and(...args: any[]): any;
  export function or(...args: any[]): any;
  export function eq(...args: any[]): any;
  export function like(...args: any[]): any;
  export function asc(...args: any[]): any;
  export function desc(...args: any[]): any;
  export function gte(...args: any[]): any;
  export function count(...args: any[]): any;
  export const sql: any;
}

declare module "drizzle-orm/mysql-core" {
  export function mysqlTable(name: string, columns: any, extras?: any): any;
  export function int(name: string, options?: any): any;
  export function varchar(name: string, options?: any): any;
  export function text(name: string, options?: any): any;
  export function json(name: string): any;
  export function timestamp(name: string, options?: any): any;
  export function boolean(name: string): any;
  export function decimal(name: string, options?: any): any;
  export function mysqlEnum(name: string, values: readonly string[]): any;
  export function uniqueIndex(name: string): any;
  export function check(name: string, expr: any): any;
  export const sql: any;
}

declare module "drizzle-orm/mysql2" {
  export function drizzle(pool: any, options?: any): any;
}

declare module "mysql2/promise" {
  export interface PoolOptions { [key: string]: any }
  export interface Pool { [key: string]: any }
  export interface Connection { [key: string]: any }
  export interface PoolConnection extends Connection { [key: string]: any }
  export function createPool(options?: PoolOptions): Pool;
  const mysql: any;
  export default mysql;
}

declare module "ioredis" {
  class Redis { constructor(...args: any[]); [key: string]: any; }
  export default Redis;
}

declare module "multer" {
  function multer(options?: any): any;
  namespace multer { function memoryStorage(): any; }
  export default multer;
}

declare module "jose" {
  export function jwtVerify(token: string, key: any, options?: any): Promise<{ payload: any }>;
  export class SignJWT { constructor(payload?: any); setProtectedHeader(h: any): this; setIssuedAt(v?: any): this; setSubject(v: string): this; setIssuer(v: string): this; setAudience(v: string): this; setExpirationTime(v: any): this; sign(key: any): Promise<string>; }
}

declare module "file-type" {
  export function fileTypeFromBuffer(buffer: any): Promise<{ mime: string; ext: string } | undefined>;
}

declare module "nanoid" {
  export function nanoid(size?: number): string;
}

declare module "class-variance-authority" {
  export function cva(...args: any[]): any;
  export type VariantProps<T = any> = any;
}

declare module "clsx" {
  export function clsx(...args: any[]): string;
  export type ClassValue = any;
}

declare module "tailwind-merge" {
  export function twMerge(...args: any[]): string;
}

declare module "sonner" {
  export const toast: { success: any; error: any; info: any; warning: any; loading: any; promise: any };
  export const Toaster: any;
  export const Sonner: any;
  export type ToasterProps = any;
  export const sonnerToast: any;
}

declare module "lucide-react" {
  export const Activity: any;
  export const AlertCircle: any;
  export const AlertTriangle: any;
  export const ArrowDownLeft: any;
  export const ArrowLeft: any;
  export const ArrowRight: any;
  export const ArrowUpDown: any;
  export const ArrowUpRight: any;
  export const Award: any;
  export const Ban: any;
  export const Banknote: any;
  export const BarChart3: any;
  export const Bell: any;
  export const Building2: any;
  export const Calendar: any;
  export const CalendarIcon: any;
  export const Car: any;
  export const Check: any;
  export const CheckCircle: any;
  export const CheckCircle2: any;
  export const CheckIcon: any;
  export const ChevronDown: any;
  export const ChevronDownIcon: any;
  export const ChevronLeft: any;
  export const ChevronLeftIcon: any;
  export const ChevronRight: any;
  export const ChevronRightIcon: any;
  export const ChevronUpIcon: any;
  export const CircleIcon: any;
  export const Clock: any;
  export const Copy: any;
  export const Cpu: any;
  export const CreditCard: any;
  export const DollarSign: any;
  export const Download: any;
  export const ExternalLink: any;
  export const Eye: any;
  export const EyeOff: any;
  export const FileText: any;
  export const FileUp: any;
  export const Filter: any;
  export const Fingerprint: any;
  export const Gamepad2: any;
  export const Gavel: any;
  export const Globe: any;
  export const Grid3x3: any;
  export const GripVerticalIcon: any;
  export const Heart: any;
  export const HelpCircle: any;
  export const History: any;
  export const Home: any;
  export const Hotel: any;
  export const Info: any;
  export const Key: any;
  export const Laptop: any;
  export const LayoutDashboard: any;
  export const LinkIcon: any;
  export const List: any;
  export const Loader: any;
  export const Loader2: any;
  export const Loader2Icon: any;
  export const Lock: any;
  export const LogOut: any;
  export const Mail: any;
  export const MapPin: any;
  export const Megaphone: any;
  export const Menu: any;
  export const MessageCircle: any;
  export const MessageSquare: any;
  export const Mic: any;
  export const MinusIcon: any;
  export const Moon: any;
  export const MoreHorizontal: any;
  export const MoreHorizontalIcon: any;
  export const Package: any;
  export const PanelLeft: any;
  export const PanelLeftIcon: any;
  export const Paperclip: any;
  export const Phone: any;
  export const PieChart: any;
  export const Plus: any;
  export const Receipt: any;
  export const RefreshCcw: any;
  export const RotateCcw: any;
  export const Save: any;
  export const Scale: any;
  export const Search: any;
  export const SearchIcon: any;
  export const Send: any;
  export const Settings: any;
  export const Share2: any;
  export const Shield: any;
  export const ShieldAlert: any;
  export const ShieldCheck: any;
  export const ShoppingBag: any;
  export const ShoppingCart: any;
  export const Smartphone: any;
  export const Star: any;
  export const Store: any;
  export const Sun: any;
  export const Tag: any;
  export const Trash2: any;
  export const TrendingUp: any;
  export const Upload: any;
  export const User: any;
  export const UserCheck: any;
  export const Users: any;
  export const Wallet: any;
  export const X: any;
  export const XCircle: any;
  export const XIcon: any;
  export const Zap: any;
}

declare module "react-day-picker" {
  export const DayPicker: any; export const DayButton: any; export function getDefaultClassNames(): any;
}

declare module "react-resizable-panels" {
  const panels: any; export = panels;
}

declare module "recharts" {
  export const BarChart: any; export const Bar: any; export const CartesianGrid: any; export const ResponsiveContainer: any; export const XAxis: any; export const YAxis: any; export const Tooltip: any; export const Cell: any;
}

declare module "date-fns" {
  export function format(...args: any[]): string;
}

declare module "date-fns/locale" {
  export const ar: any; export const zhCN: any;
}

declare module "cmdk" {
  export const CommandPrimitive: any;
}

declare module "input-otp" {
  export const OTPInput: any; export const OTPInputContext: any;
}

declare module "vaul" {
  export const DrawerPrimitive: any;
}

declare module "stream" {
  export class Readable { [key: string]: any; }
}

declare module "cookie" {
  export function parse(str: string, options?: any): Record<string, string>;
}

declare module "cors" {
  export default function cors(options?: any): any;
}

declare module "helmet" {
  export default function helmet(options?: any): any;
}

declare module "express-rate-limit" {
  export default function rateLimit(options?: any): any;
}

declare module "express-mongo-sanitize" {
  export default function mongoSanitize(options?: any): any;
}

declare module "hpp" {
  export default function hpp(options?: any): any;
}

declare module "xss-clean" {
  export default function xssClean(options?: any): any;
}

declare module "vite" {
  export interface Plugin {
    name?: string;
    transformIndexHtml?: (html: string, ctx?: any) => any;
    configureServer?: (server: any) => any;
  }
  export interface ViteDevServer {
    middlewares: any;
    transformIndexHtml(url: string, html: string): Promise<string>;
    ssrFixStacktrace(err: Error): void;
  }
  export function defineConfig(config: any): any;
  export function createServer(options?: any): Promise<ViteDevServer>;
}

declare module "@builder.io/vite-plugin-jsx-loc" {
  export function jsxLocPlugin(options?: any): import("vite").Plugin;
}

declare module "@tailwindcss/vite" {
  export default function tailwindcss(options?: any): import("vite").Plugin;
}

declare module "@vitejs/plugin-react" {
  export default function react(options?: any): import("vite").Plugin;
}

declare module "vite-plugin-manus-runtime" {
  export function vitePluginManusRuntime(options?: any): import("vite").Plugin;
}

declare module "vitest/config" {
  export function defineConfig(config: any): any;
}

declare module "vitest" {
  export const describe: any; export const it: any; export const test: any; export const expect: any;
  export const beforeEach: any; export const afterEach: any; export const beforeAll: any; export const afterAll: any; export const vi: any;
}

declare module "dotenv/config" {

}

declare module "dotenv" {
  export default function config(options?: any): any;
}

declare module "superjson" {
  const superjson: any; export default superjson;
}

declare module "streamdown" {
  const Streamdown: any; export default Streamdown;
}

declare module "axios" {
  const axios: any; export default axios;
}

declare module "dompurify" {
  const DOMPurify: any; export default DOMPurify;
}

declare module "next-themes" {
  export const ThemeProvider: any; export function useTheme(): any;
}

declare module "@tanstack/react-query" {
  export class QueryClient { constructor(...args: any[]); [key: string]: any; }
  export function QueryClientProvider(props: any): any;
}

declare module "wouter" {
  export function useLocation(): [string, (value: string) => void];
  export function useNavigate(): (to: string) => void;
  export function useSearch(): URLSearchParams;
  export function useRoute<T = Record<string, string>>(path: string): [boolean, T];
  export function useParams<T = Record<string, string>>(): T;
  export const Link: any; export const Route: any; export const Switch: any; export const Redirect: any;
}

declare module "react-hook-form" {
  export function useForm<T = any>(options?: any): any;
  export function useFormContext<T = any>(): any;
  export function useFormState<T = any>(props?: any): any;
  export function Controller(props: any): any;
  export function FormProvider(props: any): any;
  export type FieldValues = any;
  export type FieldPath<T = any> = any;
  export type ControllerProps<TFieldValues = any, TName = any> = any;
}

declare module "@radix-ui/react-slot" {
  export const Slot: any;
}

declare module "@radix-ui/react-accordion" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-alert-dialog" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-aspect-ratio" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-avatar" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-checkbox" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-collapsible" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-context-menu" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-dialog" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-dropdown-menu" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-hover-card" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-label" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-menubar" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-navigation-menu" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-popover" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-progress" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-radio-group" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-scroll-area" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-select" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-separator" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-slider" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-switch" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-tabs" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-toggle" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-toggle-group" {
  const ns: any;
  export = ns;
}

declare module "@radix-ui/react-tooltip" {
  const ns: any;
  export = ns;
}


declare namespace React {
  type ComponentProps<T = any> = any;
  type ElementType = any;
  type ChangeEvent<T = any> = any;
  type FormEvent<T = any> = any;
  type KeyboardEvent<T = any> = any;
  type CompositionEvent<T = any> = any;
  type ChangeEventHandler<T = any> = any;
  type FormEventHandler<T = any> = any;
  type KeyboardEventHandler<T = any> = any;
  type CompositionEventHandler<T = any> = any;
}

declare module "express" {
  namespace express {
    function json(options?: any): any;
    function urlencoded(options?: any): any;
  }
}

declare module "react" {
  export type ComponentProps<T = any> = any;
  export type ElementType = any;
  export type ChangeEvent<T = any> = any;
  export type FormEvent<T = any> = any;
  export type KeyboardEvent<T = any> = any;
  export type CompositionEvent<T = any> = any;
  export type ChangeEventHandler<T = any> = any;
  export type FormEventHandler<T = any> = any;
  export type KeyboardEventHandler<T = any> = any;
  export type CompositionEventHandler<T = any> = any;
}

declare module "lucide-react" {
  export const Link: any;
}


declare namespace JSX {
  interface ElementChildrenAttribute { children: {} }
}

declare namespace React {
  type ComponentProps<T = any> = any;
  type ComponentType<P = any> = any;
  type ElementType = any;
  type ImgHTMLAttributes<T = any> = any;
  type ChangeEvent<T = any> = any;
  type FormEvent<T = any> = any;
  type KeyboardEvent<T = any> = any;
  type CompositionEvent<T = any> = any;
  type ChangeEventHandler<T = any> = any;
  type FormEventHandler<T = any> = any;
  type KeyboardEventHandler<T = any> = any;
  type CompositionEventHandler<T = any> = any;
}

declare module "react" {
  export type ComponentProps<T = any> = any;
  export type ComponentType<P = any> = any;
  export type ElementType = any;
  export type ImgHTMLAttributes<T = any> = any;
  export type ChangeEvent<T = any> = any;
  export type FormEvent<T = any> = any;
  export type KeyboardEvent<T = any> = any;
  export type CompositionEvent<T = any> = any;
  export type ChangeEventHandler<T = any> = any;
  export type FormEventHandler<T = any> = any;
  export type KeyboardEventHandler<T = any> = any;
  export type CompositionEventHandler<T = any> = any;
  export function useId(): string;
  export class Component<P = any, S = any> { props: P; state: S; constructor(props?: P); setState(state: Partial<S> | ((prev: S) => Partial<S>)): void; forceUpdate(): void; }
}

declare module "cmdk" { export const Command: any; export const CommandPrimitive: any; }

declare module "vaul" { export const Drawer: any; export const DrawerPrimitive: any; }

declare module "recharts" { export const Legend: any; export type LegendProps = any; }

declare module "embla-carousel-react" { export default function useEmblaCarousel(...args: any[]): any; export type UseEmblaCarouselType = any; }

declare module "sonner" { export const toast: { success: any; error: any; info: any; warning: any; loading: any; promise: any }; }

declare namespace google {
  namespace maps {
    interface LatLngLiteral { lat: number; lng: number; }
    class Map { constructor(el: any, opts?: any); setCenter(center: any): void; }
    class Geocoder { geocode(request: any, callback?: any): any; }
    namespace marker { class AdvancedMarkerElement { constructor(opts?: any); } }
    namespace places { class Place { constructor(opts?: any); fetchFields(opts?: any): Promise<any>; location: any; } }
    namespace geometry { namespace spherical { function computeDistanceBetween(a: any, b: any): number; } }
    class DirectionsService { route(request: any, callback: any): any; }
    class DirectionsRenderer { constructor(opts?: any); setDirections(directions: any): void; }
    class TrafficLayer { setMap(map: any): void; }
    class TransitLayer { setMap(map: any): void; }
    class BicyclingLayer { setMap(map: any): void; }
    class LatLngBounds { constructor(...args: any[]); }
  }
}
declare var google: any;


declare module "decimal.js" {
  class Decimal {
    constructor(value?: Decimal.Value);
    static max(...values: Decimal[]): Decimal;
    isFinite(): boolean;
    toFixed(dp?: number): string;
    toDecimalPlaces(dp?: number): Decimal;
    minus(value: Decimal.Value): Decimal;
    plus(value: Decimal.Value): Decimal;
    mul(value: Decimal.Value): Decimal;
    div(value: Decimal.Value): Decimal;
    lt(value: Decimal.Value): boolean;
    negated(): Decimal;
  }

  namespace Decimal {
    type Value = string | number | Decimal;
  }

  export default Decimal;
}
