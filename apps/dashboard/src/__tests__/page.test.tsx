import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home', () => {
  it('renders the app title', () => {
    render(<Home />);
    expect(screen.getByText(/Hello from dashboard Next.js app!/)).toBeInTheDocument();
  });

  it('displays the calculation result', () => {
    render(<Home />);
    expect(screen.getByText('2 + 3 = 5')).toBeInTheDocument();
  });

  it('displays the greeting', () => {
    render(<Home />);
    expect(screen.getByText('Hello, Next.js User!')).toBeInTheDocument();
  });
});
