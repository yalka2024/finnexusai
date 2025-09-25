/**
 * Jest Setup for Frontend Tests
 */

import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    p: 'p',
    section: 'section',
    article: 'article',
    header: 'header',
    footer: 'footer',
    nav: 'nav',
    ul: 'ul',
    li: 'li',
    a: 'a',
    img: 'img',
    svg: 'svg',
    path: 'path',
    circle: 'circle',
    rect: 'rect',
    g: 'g',
    defs: 'defs',
    clipPath: 'clipPath',
    linearGradient: 'linearGradient',
    stop: 'stop',
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
  useMotionValue: jest.fn(),
  useTransform: jest.fn(),
  useSpring: jest.fn(),
  useScroll: jest.fn(),
  useViewportScroll: jest.fn(),
  useReducedMotion: jest.fn(),
}));

// Mock react-query
jest.mock('react-query', () => ({
  useQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    isError: false,
    error: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }) => children,
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(),
        eject: jest.fn(),
      },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
  })),
}));

// Mock Web3 and blockchain related modules
jest.mock('web3', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    eth: {
      getBalance: jest.fn(),
      getAccounts: jest.fn(),
      sendTransaction: jest.fn(),
      Contract: jest.fn(),
    },
    utils: {
      toWei: jest.fn(),
      fromWei: jest.fn(),
      toChecksumAddress: jest.fn(),
    },
  })),
}));

jest.mock('ethers', () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn(),
      Web3Provider: jest.fn(),
    },
    Contract: jest.fn(),
    utils: {
      parseEther: jest.fn(),
      formatEther: jest.fn(),
      parseUnits: jest.fn(),
      formatUnits: jest.fn(),
    },
  },
}));

// Mock chart libraries
jest.mock('recharts', () => ({
  LineChart: 'div',
  Line: 'div',
  XAxis: 'div',
  YAxis: 'div',
  CartesianGrid: 'div',
  Tooltip: 'div',
  Legend: 'div',
  ResponsiveContainer: 'div',
  BarChart: 'div',
  Bar: 'div',
  PieChart: 'div',
  Pie: 'div',
  Cell: 'div',
  AreaChart: 'div',
  Area: 'div',
  ComposedChart: 'div',
  ScatterChart: 'div',
  Scatter: 'div',
}));

jest.mock('chart.js', () => ({
  Chart: jest.fn(),
  registerables: [],
}));

jest.mock('react-chartjs-2', () => ({
  Line: 'div',
  Bar: 'div',
  Pie: 'div',
  Doughnut: 'div',
  PolarArea: 'div',
  Radar: 'div',
  Scatter: 'div',
  Bubble: 'div',
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => date.toString()),
  parseISO: jest.fn((date) => new Date(date)),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  isAfter: jest.fn(() => true),
  isBefore: jest.fn(() => false),
  differenceInDays: jest.fn(() => 0),
  differenceInHours: jest.fn(() => 0),
  differenceInMinutes: jest.fn(() => 0),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: 'div',
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
    resolvedTheme: 'light',
    themes: ['light', 'dark', 'system'],
  }),
  ThemeProvider: ({ children }) => children,
}));

// Mock zustand
jest.mock('zustand', () => ({
  create: jest.fn(() => ({
    getState: jest.fn(),
    setState: jest.fn(),
    subscribe: jest.fn(),
    destroy: jest.fn(),
  })),
  subscribeWithSelector: jest.fn(),
}));

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(),
    handleSubmit: jest.fn(),
    formState: { errors: {} },
    watch: jest.fn(),
    setValue: jest.fn(),
    getValues: jest.fn(),
    reset: jest.fn(),
    control: {},
  })),
  Controller: ({ render }) => render({ field: {}, fieldState: {} }),
  useController: jest.fn(() => ({
    field: {},
    fieldState: {},
  })),
  useFormContext: jest.fn(() => ({
    register: jest.fn(),
    handleSubmit: jest.fn(),
    formState: { errors: {} },
    watch: jest.fn(),
    setValue: jest.fn(),
    getValues: jest.fn(),
    reset: jest.fn(),
  })),
}));

// Mock @hookform/resolvers
jest.mock('@hookform/resolvers', () => ({
  zodResolver: jest.fn(),
  yupResolver: jest.fn(),
}));

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: jest.fn(() => ({})),
    getInputProps: jest.fn(() => ({})),
    isDragActive: false,
    acceptedFiles: [],
    fileRejections: [],
  })),
}));

// Mock react-select
jest.mock('react-select', () => ({
  __esModule: true,
  default: ({ options, onChange, value, ...props }) => (
    <select
      {...props}
      value={value?.value || value}
      onChange={(e) => onChange(options.find(opt => opt.value === e.target.value))}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

// Mock react-datepicker
jest.mock('react-datepicker', () => ({
  __esModule: true,
  default: ({ selected, onChange, ...props }) => (
    <input
      {...props}
      type="date"
      value={selected?.toISOString().split('T')[0] || ''}
      onChange={(e) => onChange(new Date(e.target.value))}
    />
  ),
}));

// Global test utilities
global.testUtils = {
  // Mock API responses
  mockApiResponse: (data, status = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
  }),

  // Mock user data
  mockUser: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    avatar: null,
  },

  // Mock portfolio data
  mockPortfolio: {
    id: 'test-portfolio-id',
    name: 'Test Portfolio',
    totalValue: 10000,
    totalReturn: 500,
    totalReturnPercentage: 5.0,
    assets: [],
  },

  // Mock trading data
  mockTrade: {
    id: 'test-trade-id',
    symbol: 'BTC/USDT',
    side: 'buy',
    type: 'market',
    quantity: 0.1,
    price: 45000,
    value: 4500,
    status: 'completed',
    executedAt: new Date().toISOString(),
  },

  // Mock market data
  mockMarketData: {
    symbol: 'BTC/USDT',
    price: 45000,
    change24h: 2.5,
    volume24h: 1000000,
    marketCap: 850000000000,
  },

  // Mock chart data
  mockChartData: [
    { time: '2024-01-01', price: 42000, volume: 1000000 },
    { time: '2024-01-02', price: 43000, volume: 1100000 },
    { time: '2024-01-03', price: 44000, volume: 1200000 },
    { time: '2024-01-04', price: 45000, volume: 1300000 },
  ],

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock localStorage
  mockLocalStorage: () => {
    const store = {};
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
    };
  },

  // Mock sessionStorage
  mockSessionStorage: () => {
    const store = {};
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
    };
  },
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock scrollTo
global.scrollTo = jest.fn();

// Mock fetch
global.fetch = jest.fn();

// Suppress console warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});
