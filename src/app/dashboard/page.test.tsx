import { render, screen } from '@testing-library/react';
import DashboardPage from './page';

// Mock the dynamic import properly
jest.mock('next/dynamic', () => {
  return {
    __esModule: true,
    default: (fn: any) => {
      // Execute the import function and return the default export directly
      const module = fn();
      if (module instanceof Promise) {
        return () => {
          const Component = require('@/components/Dashboard').default;
          return <Component />;
        };
      }
      return module.default;
    },
  };
});

// Mock the Dashboard component
jest.mock('@/components/Dashboard', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="mocked-dashboard">Mocked Dashboard</div>,
  };
});

describe('Dashboard Page', () => {
  it('should render without crashing', () => {
    expect(() => {
      render(<DashboardPage />);
    }).not.toThrow();
  });

  it('should render the Dashboard component inside a flex container', () => {
    const { container } = render(<DashboardPage />);

    // Check if the outer div with flex classes exists
    const flexContainer = container.firstChild as HTMLElement;
    expect(flexContainer).toHaveClass('flex');
    expect(flexContainer).toHaveClass('min-h-screen');
    expect(flexContainer).toHaveClass('flex-col');

    // Check if the Dashboard component is rendered
    const dashboard = screen.getByTestId('mocked-dashboard');
    expect(dashboard).toBeInTheDocument();
  });

  it('should have the correct page structure', () => {
    const { container } = render(<DashboardPage />);

    // Verify the flex container structure
    const flexContainer = container.firstChild as HTMLElement;
    expect(flexContainer.tagName.toLowerCase()).toBe('div');
    expect(flexContainer).toHaveClass('flex', 'min-h-screen', 'flex-col');

    // Verify the Dashboard component is inside the container
    const dashboard = screen.getByTestId('mocked-dashboard');
    expect(dashboard.parentElement).toBe(flexContainer);
  });
});