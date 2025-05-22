import React, { useState, useEffect } from 'react';
import { Page, Layout, Card, Button, Tabs, Modal, Form, FormLayout, TextField, Select, DatePicker, Stack, Text, Banner } from '@shopify/polaris';
import { LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function WealthTracker() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [netWorthData, setNetWorthData] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    percentChange: 0,
    history: []
  });
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [assetsByCategory, setAssetsByCategory] = useState([]);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddLiabilityModal, setShowAddLiabilityModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'real_estate',
    value: '',
    date: new Date()
  });
  const [newLiability, setNewLiability] = useState({
    name: '',
    category: 'mortgage',
    value: '',
    interestRate: '',
    date: new Date()
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  
  const navigate = useNavigate();
  
  const COLORS = [
    'var(--color-primary)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-error)',
    'var(--color-secondary)',
    'var(--color-primary-light)',
    'var(--color-success-light)',
    'var(--color-warning-light)'
  ];
  
  const assetCategories = [
    { label: 'Real Estate', value: 'real_estate' },
    { label: 'Investments', value: 'investments' },
    { label: 'Cash & Equivalents', value: 'cash' },
    { label: 'Vehicles', value: 'vehicles' },
    { label: 'Retirement Accounts', value: 'retirement' },
    { label: 'Cryptocurrency', value: 'crypto' },
    { label: 'Other Assets', value: 'other' }
  ];
  
  const liabilityCategories = [
    { label: 'Mortgage', value: 'mortgage' },
    { label: 'Credit Card', value: 'credit_card' },
    { label: 'Student Loans', value: 'student_loans' },
    { label: 'Auto Loans', value: 'auto_loans' },
    { label: 'Personal Loans', value: 'personal_loans' },
    { label: 'Medical Debt', value: 'medical' },
    { label: 'Other Debt', value: 'other' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found. Please log in.');
        navigate('/login');
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Fetch net worth data
        try {
          const [assetsRes, liabilitiesRes, summaryRes] = await Promise.all([
            axios.get('http://localhost:5001/api/networth/assets', { 
              headers: { Authorization: `Bearer ${token}` } 
            }),
            axios.get('http://localhost:5001/api/networth/liabilities', { 
              headers: { Authorization: `Bearer ${token}` } 
            }),
            axios.get('http://localhost:5001/api/networth/summary', { 
              headers: { Authorization: `Bearer ${token}` } 
            })
          ]);
          
          setAssets(assetsRes.data || []);
          setLiabilities(liabilitiesRes.data || []);
          
          // Generate mock history data if not available from API
          const mockHistory = generateMockNetWorthHistory(
            summaryRes.data.netWorth, 
            summaryRes.data.percentChange || 4.3
          );
          
          setNetWorthData({
            totalAssets: summaryRes.data.totalAssets || 0,
            totalLiabilities: summaryRes.data.totalLiabilities || 0,
            netWorth: summaryRes.data.netWorth || 0,
            percentChange: summaryRes.data.percentChange || 4.3,
            history: summaryRes.data.history || mockHistory
          });
          
          // Process assets by category
          processAssetsByCategory(assetsRes.data || []);
          
        } catch (netWorthError) {
          console.error('Failed to fetch net worth data:', netWorthError);
          // Set default mock data if API fails
          const mockNetWorth = 78200;
          const mockPercentChange = 4.3;
          
          // Mock assets
          const mockAssets = [
            { id: 1, name: 'Primary Home', category: 'real_estate', value: 85000, date: new Date() },
            { id: 2, name: 'Stock Portfolio', category: 'investments', value: 32000, date: new Date() },
            { id: 3, name: 'Checking Account', category: 'cash', value: 8500, date: new Date() },
            { id: 4, name: 'Savings Account', category: 'cash', value: 12000, date: new Date() },
            { id: 5, name: 'Car', category: 'vehicles', value: 5000, date: new Date() }
          ];
          
          // Mock liabilities
          const mockLiabilities = [
            { id: 1, name: 'Mortgage', category: 'mortgage', value: 42000, interestRate: 3.5, date: new Date() },
            { id: 2, name: 'Credit Card', category: 'credit_card', value: 3800, interestRate: 18.99, date: new Date() },
            { id: 3, name: 'Car Loan', category: 'auto_loans', value: 12000, interestRate: 4.5, date: new Date() },
            { id: 4, name: 'Student Loan', category: 'student_loans', value: 6500, interestRate: 5.25, date: new Date() }
          ];
          
          setAssets(mockAssets);
          setLiabilities(mockLiabilities);
          processAssetsByCategory(mockAssets);
          
          setNetWorthData({
            totalAssets: 142500,
            totalLiabilities: 64300,
            netWorth: mockNetWorth,
            percentChange: mockPercentChange,
            history: generateMockNetWorthHistory(mockNetWorth, mockPercentChange)
          });
        }
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [navigate]);
  
  const processAssetsByCategory = (assetData) => {
    const categories = {};
    assetData.forEach(asset => {
      const category = asset.category || 'other';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += parseFloat(asset.value);
    });
    
    const categoryData = Object.keys(categories).map(key => {
      // Find the label for this category
      const categoryObj = assetCategories.find(cat => cat.value === key);
      return {
        name: categoryObj ? categoryObj.label : key,
        value: categories[key]
      };
    });
    
    setAssetsByCategory(categoryData);
  };

  // Helper function to generate mock net worth history data
  const generateMockNetWorthHistory = (currentNetWorth, percentChange) => {
    const months = 12;
    const monthlyData = [];
    
    // Calculate what the net worth was 12 months ago based on the percent change
    const startingNetWorth = currentNetWorth / (1 + (percentChange / 100));
    
    // Generate a slightly randomized growth curve
    for (let i = 0; i < months; i++) {
      const progress = i / (months - 1);
      // Add some randomness to make the chart look more realistic
      const randomFactor = 0.98 + (Math.random() * 0.04); // Random between 0.98 and 1.02
      
      const value = startingNetWorth + (progress * (currentNetWorth - startingNetWorth) * randomFactor);
      
      monthlyData.push({
        month: new Date(Date.now() - (months - i - 1) * 30 * 24 * 60 * 60 * 1000)
          .toLocaleString('default', { month: 'short' }),
        value: value
      });
    }
    
    return monthlyData;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  const handleTabChange = (selectedTabIndex) => {
    setSelectedTab(selectedTabIndex);
  };
  
  const handleAddAsset = async () => {
    // Validate form
    const errors = {};
    if (!newAsset.name.trim()) errors.name = 'Name is required';
    if (!newAsset.value || isNaN(newAsset.value) || parseFloat(newAsset.value) <= 0) {
      errors.value = 'Please enter a valid positive number';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Format the asset data
      const assetData = {
        ...newAsset,
        value: parseFloat(newAsset.value),
        date: newAsset.date.toISOString()
      };
      
      // Send to API
      await axios.post('http://localhost:5001/api/networth/assets', assetData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state to include the new asset
      const newAssetWithId = {
        ...assetData,
        id: Date.now() // Temporary ID until we refresh data
      };
      
      setAssets([...assets, newAssetWithId]);
      
      // Update total assets and net worth
      const newTotalAssets = netWorthData.totalAssets + parseFloat(newAsset.value);
      const newNetWorth = newTotalAssets - netWorthData.totalLiabilities;
      
      setNetWorthData({
        ...netWorthData,
        totalAssets: newTotalAssets,
        netWorth: newNetWorth
      });
      
      // Update assets by category
      processAssetsByCategory([...assets, newAssetWithId]);
      
      // Reset form and close modal
      setNewAsset({
        name: '',
        category: 'real_estate',
        value: '',
        date: new Date()
      });
      
      setShowAddAssetModal(false);
      setSuccessMessage('Asset added successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to add asset:', error);
      setFormErrors({ submit: 'Failed to add asset. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddLiability = async () => {
    // Validate form
    const errors = {};
    if (!newLiability.name.trim()) errors.name = 'Name is required';
    if (!newLiability.value || isNaN(newLiability.value) || parseFloat(newLiability.value) <= 0) {
      errors.value = 'Please enter a valid positive number';
    }
    if (newLiability.interestRate && (isNaN(newLiability.interestRate) || parseFloat(newLiability.interestRate) < 0)) {
      errors.interestRate = 'Please enter a valid interest rate';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Format the liability data
      const liabilityData = {
        ...newLiability,
        value: parseFloat(newLiability.value),
        interestRate: newLiability.interestRate ? parseFloat(newLiability.interestRate) : null,
        date: newLiability.date.toISOString()
      };
      
      // Send to API
      await axios.post('http://localhost:5001/api/networth/liabilities', liabilityData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state to include the new liability
      const newLiabilityWithId = {
        ...liabilityData,
        id: Date.now() // Temporary ID until we refresh data
      };
      
      setLiabilities([...liabilities, newLiabilityWithId]);
      
      // Update total liabilities and net worth
      const newTotalLiabilities = netWorthData.totalLiabilities + parseFloat(newLiability.value);
      const newNetWorth = netWorthData.totalAssets - newTotalLiabilities;
      
      setNetWorthData({
        ...netWorthData,
        totalLiabilities: newTotalLiabilities,
        netWorth: newNetWorth
      });
      
      // Reset form and close modal
      setNewLiability({
        name: '',
        category: 'mortgage',
        value: '',
        interestRate: '',
        date: new Date()
      });
      
      setShowAddLiabilityModal(false);
      setSuccessMessage('Liability added successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to add liability:', error);
      setFormErrors({ submit: 'Failed to add liability. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDateChange = (date) => {
    if (showAddAssetModal) {
      setNewAsset({
        ...newAsset,
        date
      });
    } else if (showAddLiabilityModal) {
      setNewLiability({
        ...newLiability,
        date
      });
    }
  };
  
  const tabs = [
    {
      id: 'summary',
      content: 'Summary',
      accessibilityLabel: 'Summary Tab',
      panelID: 'summary-panel',
    },
    {
      id: 'assets',
      content: 'Assets',
      accessibilityLabel: 'Assets Tab',
      panelID: 'assets-panel',
    },
    {
      id: 'liabilities',
      content: 'Liabilities',
      accessibilityLabel: 'Liabilities Tab',
      panelID: 'liabilities-panel',
    },
    {
      id: 'goals',
      content: 'Goals',
      accessibilityLabel: 'Goals Tab',
      panelID: 'goals-panel',
    },
  ];

  return (
    <Page 
      title="Wealth Tracker"
      primaryAction={{
        content: 'Back to Dashboard',
        onAction: () => navigate('/dashboard')
      }}
    >
      <div className="wealth-tracker-container" style={{ animation: 'fadeIn var(--transition-normal)' }}>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange} fitted>
          {/* Summary Tab */}
          {selectedTab === 0 && (
            <div style={{ padding: 'var(--spacing-md) 0' }}>
              {successMessage && (
                <Banner
                  title={successMessage}
                  status="success"
                  onDismiss={() => setSuccessMessage('')}
                  style={{ marginBottom: 'var(--spacing-md)' }}
                />
              )}
              
              <Card>
                <Card.Section>
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <Text variant="headingMd" as="h2">Net Worth</Text>
                    <div style={{ 
                      fontSize: 'var(--font-size-3xl)', 
                      fontWeight: 'var(--font-weight-bold)',
                      margin: 'var(--spacing-md) 0'
                    }}>
                      {formatCurrency(netWorthData.netWorth)}
                    </div>
                    <Text 
                      variant="bodyMd" 
                      as="p" 
                      color={netWorthData.percentChange >= 0 ? 'success' : 'critical'}
                    >
                      {netWorthData.percentChange >= 0 ? '↑' : '↓'} {Math.abs(netWorthData.percentChange).toFixed(1)}% from last month
                    </Text>
                  </div>
                  
                  <div style={{ height: '250px', marginBottom: 'var(--spacing-lg)' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={netWorthData.history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis 
                          dataKey="month" 
                          stroke="var(--color-text-secondary)"
                        />
                        <YAxis 
                          stroke="var(--color-text-secondary)"
                          tickFormatter={(value) => formatCurrency(value).replace('.00', '')}
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: 'var(--color-card-background)',
                            borderColor: 'var(--color-border)',
                            borderRadius: 'var(--border-radius-md)',
                            boxShadow: 'var(--shadow-md)'
                          }}
                          labelFormatter={(label) => `${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name="Net Worth"
                          stroke="var(--color-primary)" 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 8 }}
                          isAnimationActive={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-lg)'
                  }}>
                    <Card>
                      <Card.Section>
                        <Text variant="headingSm" as="h3">Total Assets</Text>
                        <div style={{ 
                          fontSize: 'var(--font-size-xl)', 
                          fontWeight: 'var(--font-weight-bold)',
                          color: 'var(--color-success)',
                          margin: 'var(--spacing-sm) 0'
                        }}>
                          {formatCurrency(netWorthData.totalAssets)}
                        </div>
                        <Text variant="bodySm" as="p" color="subdued">
                          {assets.length} asset{assets.length !== 1 ? 's' : ''}
                        </Text>
                      </Card.Section>
                    </Card>
                    
                    <Card>
                      <Card.Section>
                        <Text variant="headingSm" as="h3">Total Liabilities</Text>
                        <div style={{ 
                          fontSize: 'var(--font-size-xl)', 
                          fontWeight: 'var(--font-weight-bold)',
                          color: 'var(--color-error)',
                          margin: 'var(--spacing-sm) 0'
                        }}>
                          {formatCurrency(netWorthData.totalLiabilities)}
                        </div>
                        <Text variant="bodySm" as="p" color="subdued">
                          {liabilities.length} liability/liabilities
                        </Text>
                      </Card.Section>
                    </Card>
                  </div>
                  
                  <div style={{ height: '300px' }}>
                    <Text variant="headingSm" as="h3" style={{ marginBottom: 'var(--spacing-md)' }}>
                      Asset Allocation
                    </Text>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetsByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {assetsByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: 'var(--color-card-background)',
                            borderColor: 'var(--color-border)',
                            borderRadius: 'var(--border-radius-md)',
                            boxShadow: 'var(--shadow-md)'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Section>
              </Card>
            </div>
          )}
          
          {/* Assets Tab */}
          {selectedTab === 1 && (
            <div style={{ padding: 'var(--spacing-md) 0' }}>
              {successMessage && (
                <Banner
                  title={successMessage}
                  status="success"
                  onDismiss={() => setSuccessMessage('')}
                  style={{ marginBottom: 'var(--spacing-md)' }}
                />
              )}
              
              <Card>
                <Card.Section>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    <div>
                      <Text variant="headingMd" as="h2">Your Assets</Text>
                      <Text variant="bodyMd" as="p" color="subdued">
                        Total: {formatCurrency(netWorthData.totalAssets)}
                      </Text>
                    </div>
                    <Button primary onClick={() => setShowAddAssetModal(true)}>Add Asset</Button>
                  </div>
                  
                  {assets.length === 0 ? (
                    <div style={{ 
                      padding: 'var(--spacing-xl)', 
                      textAlign: 'center',
                      backgroundColor: 'var(--color-card-background-alt)',
                      borderRadius: 'var(--border-radius-md)',
                      margin: 'var(--spacing-lg) 0'
                    }}>
                      <Text variant="bodyLg" as="p">
                        You haven't added any assets yet.
                      </Text>
                      <div style={{ marginTop: 'var(--spacing-md)' }}>
                        <Button primary onClick={() => setShowAddAssetModal(true)}>Add Your First Asset</Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {assetCategories.map(category => {
                        const categoryAssets = assets.filter(asset => asset.category === category.value);
                        if (categoryAssets.length === 0) return null;
                        
                        const categoryTotal = categoryAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);
                        
                        return (
                          <div key={category.value} style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid var(--color-border)',
                              paddingBottom: 'var(--spacing-xs)',
                              marginBottom: 'var(--spacing-sm)'
                            }}>
                              <Text variant="headingSm" as="h3">{category.label}</Text>
                              <Text variant="bodyMd" as="p">{formatCurrency(categoryTotal)}</Text>
                            </div>
                            
                            {categoryAssets.map(asset => (
                              <div 
                                key={asset.id} 
                                style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  padding: 'var(--spacing-sm) 0',
                                  borderBottom: '1px solid var(--color-border-light)'
                                }}
                              >
                                <Text variant="bodyMd" as="p">{asset.name}</Text>
                                <Text variant="bodyMd" as="p">{formatCurrency(asset.value)}</Text>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card.Section>
              </Card>
            </div>
          )}
          
          {/* Liabilities Tab */}
          {selectedTab === 2 && (
            <div style={{ padding: 'var(--spacing-md) 0' }}>
              {successMessage && (
                <Banner
                  title={successMessage}
                  status="success"
                  onDismiss={() => setSuccessMessage('')}
                  style={{ marginBottom: 'var(--spacing-md)' }}
                />
              )}
              
              <Card>
                <Card.Section>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    <div>
                      <Text variant="headingMd" as="h2">Your Liabilities</Text>
                      <Text variant="bodyMd" as="p" color="subdued">
                        Total: {formatCurrency(netWorthData.totalLiabilities)}
                      </Text>
                    </div>
                    <Button primary onClick={() => setShowAddLiabilityModal(true)}>Add Liability</Button>
                  </div>
                  
                  {liabilities.length === 0 ? (
                    <div style={{ 
                      padding: 'var(--spacing-xl)', 
                      textAlign: 'center',
                      backgroundColor: 'var(--color-card-background-alt)',
                      borderRadius: 'var(--border-radius-md)',
                      margin: 'var(--spacing-lg) 0'
                    }}>
                      <Text variant="bodyLg" as="p">
                        You haven't added any liabilities yet.
                      </Text>
                      <div style={{ marginTop: 'var(--spacing-md)' }}>
                        <Button primary onClick={() => setShowAddLiabilityModal(true)}>Add Your First Liability</Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {liabilityCategories.map(category => {
                        const categoryLiabilities = liabilities.filter(liability => liability.category === category.value);
                        if (categoryLiabilities.length === 0) return null;
                        
                        const categoryTotal = categoryLiabilities.reduce((sum, liability) => sum + parseFloat(liability.value), 0);
                        
                        return (
                          <div key={category.value} style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid var(--color-border)',
                              paddingBottom: 'var(--spacing-xs)',
                              marginBottom: 'var(--spacing-sm)'
                            }}>
                              <Text variant="headingSm" as="h3">{category.label}</Text>
                              <Text variant="bodyMd" as="p">{formatCurrency(categoryTotal)}</Text>
                            </div>
                            
                            {categoryLiabilities.map(liability => (
                              <div 
                                key={liability.id} 
                                style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  padding: 'var(--spacing-sm) 0',
                                  borderBottom: '1px solid var(--color-border-light)'
                                }}
                              >
                                <div>
                                  <Text variant="bodyMd" as="p">{liability.name}</Text>
                                  {liability.interestRate && (
                                    <Text variant="bodySm" as="p" color="subdued">
                                      {liability.interestRate}% interest
                                    </Text>
                                  )}
                                </div>
                                <Text variant="bodyMd" as="p">{formatCurrency(liability.value)}</Text>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card.Section>
              </Card>
            </div>
          )}
          
          {/* Goals Tab */}
          {selectedTab === 3 && (
            <div style={{ padding: 'var(--spacing-md) 0' }}>
              <Card>
                <Card.Section>
                  <div style={{ 
                    padding: 'var(--spacing-xl)', 
                    textAlign: 'center',
                    backgroundColor: 'var(--color-card-background-alt)',
                    borderRadius: 'var(--border-radius-md)',
                    margin: 'var(--spacing-lg) 0'
                  }}>
                    <Text variant="headingMd" as="h2" style={{ marginBottom: 'var(--spacing-md)' }}>
                      Coming Soon: Wealth Goals
                    </Text>
                    <Text variant="bodyLg" as="p">
                      Set targets for your net worth and track your progress over time.
                    </Text>
                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                      <Button primary disabled>Set Your First Goal</Button>
                    </div>
                  </div>
                </Card.Section>
              </Card>
            </div>
          )}
        </Tabs>
        
        {/* Add Asset Modal */}
        <Modal
          open={showAddAssetModal}
          onClose={() => {
            setShowAddAssetModal(false);
            setFormErrors({});
          }}
          title="Add New Asset"
          primaryAction={{
            content: 'Add Asset',
            onAction: handleAddAsset,
            loading: isLoading
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => {
                setShowAddAssetModal(false);
                setFormErrors({});
              }
            }
          ]}
        >
          <Modal.Section>
            <Form onSubmit={(e) => {
              e.preventDefault();
              handleAddAsset();
            }}>
              <FormLayout>
                {formErrors.submit && (
                  <Banner status="critical">
                    <p>{formErrors.submit}</p>
                  </Banner>
                )}
                
                <TextField
                  label="Asset Name"
                  value={newAsset.name}
                  onChange={(value) => setNewAsset({...newAsset, name: value})}
                  error={formErrors.name}
                  autoComplete="off"
                />
                
                <Select
                  label="Category"
                  options={assetCategories}
                  value={newAsset.category}
                  onChange={(value) => setNewAsset({...newAsset, category: value})}
                />
                
                <TextField
                  label="Value"
                  value={newAsset.value}
                  onChange={(value) => setNewAsset({...newAsset, value: value})}
                  error={formErrors.value}
                  type="number"
                  prefix="$"
                  autoComplete="off"
                />
                
                <DatePicker
                  month={newAsset.date.getMonth()}
                  year={newAsset.date.getFullYear()}
                  onChange={handleDateChange}
                  selected={newAsset.date}
                  label="Acquisition Date"
                />
              </FormLayout>
            </Form>
          </Modal.Section>
        </Modal>
        
        {/* Add Liability Modal */}
        <Modal
          open={showAddLiabilityModal}
          onClose={() => {
            setShowAddLiabilityModal(false);
            setFormErrors({});
          }}
          title="Add New Liability"
          primaryAction={{
            content: 'Add Liability',
            onAction: handleAddLiability,
            loading: isLoading
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => {
                setShowAddLiabilityModal(false);
                setFormErrors({});
              }
            }
          ]}
        >
          <Modal.Section>
            <Form onSubmit={(e) => {
              e.preventDefault();
              handleAddLiability();
            }}>
              <FormLayout>
                {formErrors.submit && (
                  <Banner status="critical">
                    <p>{formErrors.submit}</p>
                  </Banner>
                )}
                
                <TextField
                  label="Liability Name"
                  value={newLiability.name}
                  onChange={(value) => setNewLiability({...newLiability, name: value})}
                  error={formErrors.name}
                  autoComplete="off"
                />
                
                <Select
                  label="Category"
                  options={liabilityCategories}
                  value={newLiability.category}
                  onChange={(value) => setNewLiability({...newLiability, category: value})}
                />
                
                <TextField
                  label="Amount Owed"
                  value={newLiability.value}
                  onChange={(value) => setNewLiability({...newLiability, value: value})}
                  error={formErrors.value}
                  type="number"
                  prefix="$"
                  autoComplete="off"
                />
                
                <TextField
                  label="Interest Rate (%)"
                  value={newLiability.interestRate}
                  onChange={(value) => setNewLiability({...newLiability, interestRate: value})}
                  error={formErrors.interestRate}
                  type="number"
                  suffix="%"
                  helpText="Optional"
                  autoComplete="off"
                />
                
                <DatePicker
                  month={newLiability.date.getMonth()}
                  year={newLiability.date.getFullYear()}
                  onChange={handleDateChange}
                  selected={newLiability.date}
                  label="Start Date"
                />
              </FormLayout>
            </Form>
          </Modal.Section>
        </Modal>
      </div>
    </Page>
  );
}

export default WealthTracker;
