import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepIndicator } from '@/components/domain/StepIndicator';

describe('StepIndicator', () => {
  it('renders every step with its ordinal and detail text', () => {
    render(
      <StepIndicator
        steps={[
          { label: 'Create Cloudflare Zone', status: 'success', detail: 'Zone ID: zone-1' },
          { label: 'Extract Nameservers', status: 'loading' },
          { label: 'Register on DPDNS', status: 'error', detail: 'Domain already exists' },
        ]}
      />,
    );

    expect(screen.getByText('1. Create Cloudflare Zone')).toBeInTheDocument();
    expect(screen.getByText('Zone ID: zone-1')).toBeInTheDocument();
    expect(screen.getByText('2. Extract Nameservers')).toBeInTheDocument();
    expect(screen.getByText('3. Register on DPDNS')).toBeInTheDocument();
    expect(screen.getByText('Domain already exists')).toBeInTheDocument();
  });
});
