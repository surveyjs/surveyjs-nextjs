import { render, screen } from '@testing-library/react';
import Homepage from './page';

describe('Homepage', () => {
  it('renders the main heading', () => {
    render(<Homepage />);
    
    const heading = screen.getByText(/SurveyJS \+ NextJS Quickstart Template/i);
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H1');
  });

  it('renders the main content paragraph', () => {
    render(<Homepage />);
    
    const paragraph = screen.getByText(/SurveyJS is a set of JavaScript components/i);
    expect(paragraph).toBeInTheDocument();
    expect(paragraph.tagName).toBe('P');
  });

  it('renders all four links correctly', () => {
    render(<Homepage />);
    
    // Check that all four links exist
    expect(screen.getByRole('link', { name: /SurveyJS Form Library/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Survey Creator \/ Form Builder/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /PDF Generator/i })).toBeInTheDocument();

    // Check that the links have the correct URLs
    expect(screen.getByRole('link', { name: /SurveyJS Form Library/i }))
      .toHaveAttribute('href', 'https://surveyjs.io/Documentation/Library?id=LibraryOverview');
    
    expect(screen.getByRole('link', { name: /Survey Creator \/ Form Builder/i }))
      .toHaveAttribute('href', 'https://surveyjs.io/Documentation/Survey-Creator?id=Survey-Creator-Overview');
    
    expect(screen.getByRole('link', { name: /Dashboard/i }))
      .toHaveAttribute('href', 'https://surveyjs.io/Documentation/Analytics?id=AnalyticsOverview');
    
    expect(screen.getByRole('link', { name: /PDF Generator/i }))
      .toHaveAttribute('href', 'https://surveyjs.io/Documentation/Pdf-Export?id=PdfExportOverview');
  });

  it('renders links with underline style', () => {
    render(<Homepage />);
    
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      // Since the links have inline styles, check that they're present
      expect(link).toHaveStyle({ textDecoration: 'underline' });
    });
  });

  it('renders external link targets', () => {
    render(<Homepage />);
    
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      // All links in this component are external and should have target="_blank"
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  it('matches the snapshot', () => {
    const { container } = render(<Homepage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});