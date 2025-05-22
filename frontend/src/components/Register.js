import React, { useState } from 'react';
import { Page, Card, FormLayout, TextField, Button, Banner, Modal, Text, Stack, Spinner, Link as PolarisLink } from '@shopify/polaris';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState('');

  // Password strength checker
  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength(0);
      setPasswordFeedback('');
      return;
    }
    
    let strength = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) {
      strength += 1;
    } else {
      feedback.push('Use at least 8 characters');
    }
    
    // Complexity checks
    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push('Add uppercase letters');
    
    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push('Add lowercase letters');
    
    if (/[0-9]/.test(password)) strength += 1;
    else feedback.push('Add numbers');
    
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    else feedback.push('Add special characters');
    
    setPasswordStrength(strength);
    setPasswordFeedback(feedback.join(', '));
  };

  const handleRegister = async () => {
    // Client-side validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    
    if (passwordStrength < 3) {
      setError('Please create a stronger password');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('http://localhost:5001/register', { email, password });
      setTotpSecret(response.data.totpSecret);
      setSuccess(response.data.message);
      setShowWelcome(true);
      setEmail('');
      setPassword('');
      setPasswordConfirm('');
      setPasswordStrength(0);
      setPasswordFeedback('');
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength === 0) return 'var(--color-text-tertiary)';
    if (passwordStrength < 3) return 'var(--color-warning)';
    if (passwordStrength < 4) return 'var(--color-warning-light)';
    return 'var(--color-success)';
  };

  return (
    <Page>
      <div className="register-container" style={{
        maxWidth: '450px',
        margin: '0 auto',
        padding: 'var(--spacing-xl) var(--spacing-md)',
        animation: 'fadeIn var(--transition-normal)'
      }}>
        <div className="register-header" style={{
          textAlign: 'center',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            color: 'var(--color-secondary)',
            marginBottom: 'var(--spacing-md)'
          }}>Create Your Account</h1>
          <Text as="p" color="subdued">
            Join thousands of users managing their finances
          </Text>
        </div>
        
        <Card>
          <Card.Section>
            {error && (
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <Banner status="critical">
                  {error}
                </Banner>
              </div>
            )}
            
            {success && !showWelcome && (
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <Banner status="success">
                  <p>{success}</p>
                  {totpSecret && (
                    <p>Scan this secret with your authenticator app: <strong>{totpSecret}</strong></p>
                  )}
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
                disabled={isLoading}
                autoFocus
              />
              
              <div>
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    checkPasswordStrength(value);
                  }}
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                
                {password && (
                  <div style={{ marginTop: 'var(--spacing-xs)' }}>
                    <div style={{ 
                      display: 'flex', 
                      height: '4px', 
                      width: '100%', 
                      backgroundColor: 'var(--color-border)',
                      borderRadius: 'var(--border-radius-full)',
                      overflow: 'hidden',
                      marginBottom: 'var(--spacing-xs)'
                    }}>
                      <div style={{ 
                        width: `${(passwordStrength / 5) * 100}%`, 
                        backgroundColor: getStrengthColor(),
                        transition: 'width var(--transition-normal), background-color var(--transition-normal)'
                      }}></div>
                    </div>
                    <Text as="span" color="subdued" variant="bodySm">
                      {passwordFeedback || (
                        passwordStrength < 3 ? 'Weak password' : 
                        passwordStrength < 4 ? 'Good password' : 
                        'Strong password'
                      )}
                    </Text>
                  </div>
                )}
              </div>
              
              <TextField
                label="Confirm Password"
                type="password"
                value={passwordConfirm}
                onChange={(value) => setPasswordConfirm(value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={isLoading}
                error={passwordConfirm && password !== passwordConfirm ? 'Passwords do not match' : undefined}
              />
              
              <Button
                primary
                fullWidth
                onClick={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                size="large"
              >
                Create Account
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
            Already have an account? <RouterLink to="/login"><PolarisLink>Sign In</PolarisLink></RouterLink>
          </Text>
        </div>
      </div>
      
      <Modal
        open={showWelcome}
        onClose={() => setShowWelcome(false)}
        title="Welcome to Budgeting App!"
        primaryAction={{
          content: 'Log In Now',
          onAction: () => {
            setShowWelcome(false);
            window.location.href = '/login';
          },
        }}
      >
        <Modal.Section>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-lg) 0' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--color-success-light)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto var(--spacing-lg)'
            }}>
              <span style={{ fontSize: '40px' }}>✓</span>
            </div>
            
            <Text variant="headingLg" as="h2">
              Account Created Successfully!
            </Text>
            
            <div style={{ margin: 'var(--spacing-lg) 0' }}>
              <Text as="p">
                Your account is ready! Log in to start managing your finances.
              </Text>
            </div>
            
            {totpSecret && (
              <div style={{ 
                margin: 'var(--spacing-lg) 0',
                padding: 'var(--spacing-lg)',
                backgroundColor: 'var(--color-card-background-alt)',
                borderRadius: 'var(--border-radius-md)'
              }}>
                <Text variant="headingMd" as="h3" fontWeight="medium">
                  Set up 2-Factor Authentication
                </Text>
                <Text as="p" color="subdued">
                  Scan this secret with your authenticator app (e.g., Google Authenticator, Authy):
                </Text>
                <div style={{ 
                  padding: 'var(--spacing-md)',
                  margin: 'var(--spacing-md) 0',
                  backgroundColor: 'white',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {totpSecret}
                </div>
                <Text as="p" variant="bodySm" color="subdued">
                  Make sure to save this secret in a safe place in case you lose access to your authenticator app.
                </Text>
              </div>
            )}
          </div>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default Register;
