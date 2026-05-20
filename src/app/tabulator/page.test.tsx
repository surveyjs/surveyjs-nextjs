import SurveyTabulator from './page';

// Mock the dynamic import to avoid issues with SSR and external dependencies
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: jest.fn((fn) => {
    const result: any = jest.fn();
    result.displayName = 'DynamicComponent';
    return result;
  }),
}));

// Mock the DashboardTabulator component
jest.mock('@/components/DashboardTabulator', () => ({
  __esModule: true,
  default: () => {
    return { displayName: 'DashboardTabulator' };
  },
}));

describe('SurveyTabulator Page Component', () => {
  it('should be defined', () => {
    expect(SurveyTabulator).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof SurveyTabulator).toBe('function');
  });

  it('should render correctly with mocked dependencies', () => {
    // Just check that the component function exists and is callable
    const result = SurveyTabulator();  // Call the component function
    expect(result).toBeDefined();
  });
});