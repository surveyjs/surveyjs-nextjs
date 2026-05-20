import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home', () => {
  it('renders a heading', () => {
    render(<Home />);
    
    const headingElement = screen.getByText(/home/i);
    expect(headingElement).toBeInTheDocument();
  });

  it('has correct container classes', () => {
    render(<Home />);
    
    const containerDiv = screen.getByText(/home/i).closest('div');
    expect(containerDiv).toHaveClass('flex');
    expect(containerDiv).toHaveClass('min-h-screen');
    expect(containerDiv).toHaveClass('flex-col');
    expect(containerDiv).toHaveClass('items-center');
    expect(containerDiv).toHaveClass('p-8');
  });

  it('renders correctly with snapshot', () => {
    const { container } = render(<Home />);
    expect(container.firstChild).toMatchSnapshot();
  });
});