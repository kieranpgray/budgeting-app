import React, { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, Button, Spinner, Text, Stack, ProgressBar, Heading } from '@shopify/polaris';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';

function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [netBalance, setNetBalance] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

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

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found. Please log in.');
        window.location.href = '/login';
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Fetch expenses
        const expensesResponse = await axios.get('http://localhost:5001/api/expenses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setExpenses(expensesResponse.data);
        
        // Calculate total expenses
        const expTotal = expensesResponse.data.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        setTotalExpenses(expTotal.toFixed(2));
        
        // Fetch incomes
        const incomesResponse = await axios.get('http://localhost:5001/api/incomes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIncomes(incomesResponse.data);
        
        // Calculate total income
        const incTotal = incomesResponse.data.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
        setTotalIncome(incTotal.toFixed(2));
        
        // Calculate net balance
        setNetBalance((incTotal - expTotal).toFixed(2));
        
        // Fetch notifications
        const notificationsResponse = await axios.get('http://localhost:5001/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(notificationsResponse.data);
        
        // Process expenses by category
        const categories = {};
        expensesResponse.data.forEach(expense => {
          const category = expense.category || 'Uncategorized';
          if (!categories[category]) {
            categories[category] = 0;
          }
          categories[category] += parseFloat(expense.amount);
        });
        
        const categoryData = Object.keys(categories).map(key => ({
          name: key,
          value: categories[key]
        }));
        
        setExpensesByCategory(categoryData);
        
        // Process monthly data
        const months = {};
        const currentYear = new Date().getFullYear();
        
        // Initialize months
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach(month => {
          months[month] = { income: 0, expenses: 0 };
        });
        
        // Add expense data
        expensesResponse.data.forEach(expense => {
          const date = new Date(expense.date);
          if (date.getFullYear() === currentYear) {
            const month = date.toLocaleString('default', { month: 'short' });
            months[month].expenses += parseFloat(expense.amount);
          }
        });
        
        // Add income data
        incomesResponse.data.forEach(income => {
          const date = new Date(income.date);
          if (date.getFullYear() === currentYear) {
            const month = date.toLocaleString('default', { month: 'short' });
            months[month].income += parseFloat(income.amount);
          }
        });
        
        const monthlyDataArray = Object.keys(months).map(month => ({
          name: month,
          income: months[month].income,
          expenses: months[month].expenses,
          balance: months[month].income - months[month].expenses
        }));
        
        setMonthlyData(monthlyDataArray);
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  if (isLoading) {
    return (
      <Page>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh' 
        }}>
          <Stack vertical alignment="center" spacing="tight">
            <Spinner size="large" color="teal" />
            <Text variant="bodyMd" as="p" color="subdued">
              Loading your financial dashboard...
            </Text>
          </Stack>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Financial Dashboard">
      <div className="dashboard-container" style={{ animation: 'fadeIn var(--transition-normal)' }}>
        {/* Summary Cards */}
        <Layout>
          <Layout.Section oneThird>
            <Card>
              <Card.Section>
                <Stack vertical spacing="tight">
                  <Text variant="headingSm" as="h3" color="subdued">Total Income</Text>
                  <Text variant="heading2xl" as="p" color="success">
                    {formatCurrency(totalIncome)}
                  </Text>
                  <Text variant="bodySm" as="p" color="subdued">
                    From {incomes.length} income sources
                  </Text>
                </Stack>
              </Card.Section>
            </Card>
          </Layout.Section>
          
          <Layout.Section oneThird>
            <Card>
              <Card.Section>
                <Stack vertical spacing="tight">
                  <Text variant="headingSm" as="h3" color="subdued">Total Expenses</Text>
                  <Text variant="heading2xl" as="p" color="critical">
                    {formatCurrency(totalExpenses)}
                  </Text>
                  <Text variant="bodySm" as="p" color="subdued">
                    From {expenses.length} expense entries
                  </Text>
                </Stack>
              </Card.Section>
            </Card>
          </Layout.Section>
          
          <Layout.Section oneThird>
            <Card>
              <Card.Section>
                <Stack vertical spacing="tight">
                  <Text variant="headingSm" as="h3" color="subdued">Net Balance</Text>
                  <Text 
                    variant="heading2xl" 
                    as="p" 
                    color={parseFloat(netBalance) >= 0 ? 'success' : 'critical'}
                  >
                    {formatCurrency(netBalance)}
                  </Text>
                  <Text variant="bodySm" as="p" color="subdued">
                    {parseFloat(netBalance) >= 0 ? 'Positive balance' : 'Negative balance'}
                  </Text>
                </Stack>
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Charts Section */}
        <Layout>
          <Layout.Section>
            <Card title="Monthly Income vs. Expenses">
              <Card.Section>
                <div style={{ height: '300px', marginTop: 'var(--spacing-md)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" stroke="var(--color-text-secondary)" />
                      <YAxis stroke="var(--color-text-secondary)" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--color-card-background)',
                          borderColor: 'var(--color-border)',
                          borderRadius: 'var(--border-radius-md)',
                          boxShadow: 'var(--shadow-md)'
                        }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="var(--color-error)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section oneHalf>
            <Card title="Expense Breakdown">
              <Card.Section>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {expensesByCategory.map((entry, index) => (
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
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card.Section>
            </Card>
          </Layout.Section>
          
          <Layout.Section oneHalf>
            <Card title="Net Balance Trend">
              <Card.Section>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" stroke="var(--color-text-secondary)" />
                      <YAxis stroke="var(--color-text-secondary)" />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: 'var(--color-card-background)',
                          borderColor: 'var(--color-border)',
                          borderRadius: 'var(--border-radius-md)',
                          boxShadow: 'var(--shadow-md)'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        name="Net Balance"
                        stroke="var(--color-primary)"
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Quick Actions */}
        <Layout>
          <Layout.Section>
            <Card title="Quick Actions">
              <Card.Section>
                <Stack distribution="fillEvenly" wrap={false}>
                  <Button url="/income" primary>Add Income</Button>
                  <Button url="/expenses">Add Expense</Button>
                  <Button url="/budgets">Manage Budgets</Button>
                  <Button url="/data-io">Import/Export Data</Button>
                </Stack>
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Notifications */}
        {notifications.length > 0 && (
          <Layout>
            <Layout.Section>
              <Card title="Notifications">
                <Card.Section>
                  <Stack vertical spacing="tight">
                    {notifications.map((notification, index) => (
                      <div 
                        key={index}
                        style={{ 
                          padding: 'var(--spacing-md)',
                          backgroundColor: 'var(--color-card-background-alt)',
                          borderRadius: 'var(--border-radius-md)',
                          borderLeft: '4px solid var(--color-warning)',
                          animation: 'slideUp var(--transition-normal)'
                        }}
                      >
                        <Text variant="bodyMd" as="p">
                          {notification.message || `Reminder: ${notification.description} due on ${new Date(notification.date).toLocaleDateString()}`}
                        </Text>
                      </div>
                    ))}
                  </Stack>
                </Card.Section>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </div>
    </Page>
  );
}

export default Dashboard;
