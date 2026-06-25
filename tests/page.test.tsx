import { render, screen } from '@testing-library/react';
import Home from '../src/app/page';

describe('Home Page', () => {
  it('renders the dashboard heading', () => {
    render(<Home />);
    
    const heading = screen.getByRole('heading', {
      name: /YouTube SEO Optimize Dashboard/i,
    });
    
    expect(heading).toBeInTheDocument();
  });
});
