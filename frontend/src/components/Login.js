import React, { useState } from 'react';
import { Page, Card, FormLayout, TextField, Button, Banner, Spinner, Stack, Text, Link as PolarisLink } from '@shopify/polaris';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    setIsAnimating(true);
    
    try {
      const result = await login(email, password);
      if (result.requires2FA) {
        setRequires2FA(true);
        setTempToken(result.tempToken);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handle2FA = async () => {
    setIsLoading(true);
    setError('');
    setIsAnimating(true);
    
    try {
      await verify2FA(tempToken, totpCode);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid 2FA code. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (requires2FA) {
        handle2FA();
      } else {
        handleLogin();
      }
    }
  };

  return (
    <Page>
      <div className="login-container" style={{
        maxWidth: '450px',
        margin: '0 auto',
        padding: 'var(--spacing-xl) var(--spacing-md)',
        animation: 'fadeIn var(--transition-normal)'
      }}>
        <div className="login-header" style={{
          textAlign: 'center',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            color: 'var(--color-secondary)',
            marginBottom: 'var(--spacing-md)'
          }}>Welcome Back</h1>
          <Text as="p" color="subdued">
            Sign in to access your financial dashboard
          </Text>
        </div>
        
        <Card>
          <Card.Section>
            {error && (
              <div className="error-banner" style={{
                marginBottom: 'var(--spacing-md)',
                animation: isAnimating ? 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' : 'none'
              }}>
                <Banner status="critical">
                  {error}
                </Banner>
              </div>
            )}
            
            <FormLayout>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(value) => setEmail(value)}
                placeholder="example@email.com"
                autoComplete="email"
                onKeyPress={handleKeyPress}
                disabled={isLoading || requires2FA}
                error={error && !requires2FA ? ' ' : undefined}
                autoFocus
              />
              
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(value) => setPassword(value)}
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyPress={handleKeyPress}
                disabled={isLoading || requires2FA}
                error={error && !requires2FA ? ' ' : undefined}
              />
              
              {requires2FA && (
                <div className="totp-container" style={{
                  animation: 'slideUp var(--transition-normal)'
                }}>
                  <TextField
                    label="2FA Code"
                    value={totpCode}
                    onChange={(value) => setTotpCode(value)}
                    placeholder="123456"
                    autoFocus
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    error={error && requires2FA ? ' ' : undefined}
                  />
                </div>
              )}
              
              <div style={{ textAlign: 'right' }}>
                <RouterLink to="/request-password-reset" style={{ textDecoration: 'none' }}>
                  <PolarisLink>Forgot password?</PolarisLink>
                </RouterLink>
              </div>
              
              <Button
                primary
                fullWidth
                onClick={requires2FA ? handle2FA : handleLogin}
                loading={isLoading}
                disabled={isLoading}
                size="large"
              >
                {requires2FA ? 'Verify 2FA' : 'Sign In'}
              </Button>
            </FormLayout>
          </Card.Section>
        </Card>
        
        <div style={{ 
          marginTop: 'var(--spacing-lg)', 
          textAlign: 'center',
          padding: 'var(--spacing-md)'
        }}>
          <Text as="p" color="subdued">
            Don't have an account? <RouterLink to="/register"><PolarisLink>Create Account</PolarisLink></RouterLink>
          </Text>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
      `}</style>
    </Page>
  );
}

export default Login;
