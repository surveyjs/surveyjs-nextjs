import { render, screen } from '@testing-library/react';
import Header from './Header';

describe('Header Component', () => {
  it('renders the header element', () => {
    render(<Header />);
    
    const headerElement = screen.getByRole('banner');
    expect(headerElement).toBeInTheDocument();
    expect(headerElement).toHaveClass('max-w-screen-xl');
  });

  it('renders the Next.js logo link', () => {
    render(<Header />);
    
    // Check that the logo link exists and points to home page
    const logoLink = screen.getByRole('link', { 
      name: /next\.js logo/i 
    });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute('href', '/');
    
    // Check that the image is present
    const logoImage = screen.getByAltText('Next.js Logo');
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute('src', '/next.svg');
    expect(logoImage).toHaveAttribute('width', '180');
    expect(logoImage).toHaveAttribute('height', '37');
  });

  it('renders all navigation links', () => {
    render(<Header />);
    
    // Check that all navigation links are present
    expect(screen.getByText('Form Library')).toBeInTheDocument();
    expect(screen.getByText('Survey Creator')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Results Table')).toBeInTheDocument();
    expect(screen.getByText('PDF Generator')).toBeInTheDocument();
    
    // Check that links have correct href attributes
    expect(screen.getByRole('link', { name: 'Form Library' })).toHaveAttribute('href', '/survey');
    expect(screen.getByRole('link', { name: 'Survey Creator' })).toHaveAttribute('href', '/creator');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Results Table' })).toHaveAttribute('href', '/tabulator');
    expect(screen.getByRole('link', { name: 'PDF Generator' })).toHaveAttribute('href', '/pdf-export');
  });

  it('has correct classes applied to navigation links', () => {
    render(<Header />);
    
    const navLinks = screen.getAllByRole('link');
    const linksWithExpectedClasses = navLinks.filter(link => 
      link.textContent === 'Form Library' || 
      link.textContent === 'Survey Creator' || 
      link.textContent === 'Dashboard' || 
      link.textContent === 'Results Table' || 
      link.textContent === 'PDF Generator'
    );
    
    // Check that each navigation link has common classes
    linksWithExpectedClasses.forEach(link => {
      expect(link).toHaveClass('block');
      expect(link).toHaveClass('py-2');
      expect(link).toHaveClass('px-3');
    });
  });

  it('uses Link components for navigation', () => {
    render(<Header />);
    
    // All navigation links should be Next.js Link components
    const formLibraryLink = screen.getByText('Form Library');
    expect(formLibraryLink.closest('a')).toHaveAttribute('href', '/survey');
    
    const surveyCreatorLink = screen.getByText('Survey Creator');
    expect(surveyCreatorLink.closest('a')).toHaveAttribute('href', '/creator');
    
    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard');
    
    const resultsTableLink = screen.getByText('Results Table');
    expect(resultsTableLink.closest('a')).toHaveAttribute('href', '/tabulator');
    
    const pdfGeneratorLink = screen.getByText('PDF Generator');
    expect(pdfGeneratorLink.closest('a')).toHaveAttribute('href', '/pdf-export');
  });
});