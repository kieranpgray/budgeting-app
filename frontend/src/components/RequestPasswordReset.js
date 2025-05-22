import React, { useState } from 'react';
import { Page, Card, FormLayout, TextField, Button, Banner, Spinner, Stack, Text, Link as PolarisLink } from '@shopify/polaris';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';

function RequestPasswordReset() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRequestReset = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      // Replace with your actual API endpoint
      const response = await axios.post('http://localhost:5001/request-password-reset', { email });
      setSuccessMessage(response.data.message || 'If an account with that email exists, a password reset link has been sent.');
      setEmail(''); // Clear email field on success
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request password reset. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <Page title="Reset Your Password">
      <Card sectioned>
        <Stack vertical alignment="center" spacing="loose">
          {error && (
            <Banner status="critical" title="Error">
              {error}
            </Banner>
          )}
          {successMessage && (
            <Banner status="success" title="Success">
              {successMessage}
            </Banner>
          )}
          <Text as="p">Enter the email address associated with your account, and we'll send you a link to reset your password.</Text>
          <FormLayout>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="example@email.com"
              autoComplete="email"
              aria-label="Enter your email address"
              disabled={isLoading}
            />
            {isLoading ? (
              <Spinner size="small" />
            ) : (
              <Button
                primary
                onClick={handleRequestReset}
                aria-label="Send password reset email"
                disabled={isLoading || !email}
              >
                Send Reset Link
              </Button>
            )}
          </FormLayout>
          <div style={{ marginTop: '20px' }}>
            <Text as="p">
              Remember your password? <RouterLink to="/login"><PolarisLink>Login</PolarisLink></RouterLink>
            </Text>
          </div>
        </Stack>
      </Card>
    </Page>
  );
}

export default RequestPasswordReset;
