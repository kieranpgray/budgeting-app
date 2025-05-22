import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // Or your preferred HTTP client

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const IncomeManagement = () => {
    const [incomes, setIncomes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentIncome, setCurrentIncome] = useState({
        id: null, // To store income_id when editing
        description: '',
        amount: '',
        category: 'Salary',
        date: new Date().toISOString().split('T')[0], // Default to today
        recurring: false,
        frequency: ''
    });

    const getToken = () => localStorage.getItem('token');

    const fetchIncomes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = getToken();
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setIsLoading(false);
                return;
            }
            const response = await axios.get(`${API_URL}/incomes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIncomes(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch incomes. Please try again later.');
            console.error("Fetch incomes error:", err);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchIncomes();
    }, [fetchIncomes]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentIncome(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
            // Reset frequency if recurring is unchecked
            ...(name === 'recurring' && !checked && { frequency: '' })
        }));
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrentIncome({
            id: null,
            description: '',
            amount: '',
            category: 'Salary',
            date: new Date().toISOString().split('T')[0],
            recurring: false,
            frequency: ''
        });
        setShowForm(false);
        setError(null); // Clear previous form errors
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const token = getToken();
        if (!token) {
            setError('Authentication token not found. Please log in.');
            setIsLoading(false);
            return;
        }

        const method = isEditing ? 'put' : 'post';
        const url = isEditing ? `${API_URL}/incomes/${currentIncome.id}` : `${API_URL}/incomes`;

        // Basic validation
        if (!currentIncome.description.trim() || !currentIncome.amount || parseFloat(currentIncome.amount) <= 0) {
            setError('Description and a valid positive amount are required.');
            setIsLoading(false);
            return;
        }
        if (currentIncome.recurring && !currentIncome.frequency) {
            setError('Please select a frequency for recurring income.');
            setIsLoading(false);
            return;
        }

        try {
            await axios[method](url, currentIncome, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchIncomes(); // Refresh list
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} income. Please check your input and try again.`);
            console.error("Submit income error:", err);
        }
        setIsLoading(false);
    };

    const handleEdit = (income) => {
        setCurrentIncome({ 
            ...income, 
            id: income.income_id, // Ensure id is set for editing
            date: new Date(income.date).toISOString().split('T')[0] 
        });
        setIsEditing(true);
        setShowForm(true);
        setError(null); // Clear previous errors
    };

    const handleDelete = async (incomeId) => {
        if (window.confirm('Are you sure you want to delete this income entry? This action cannot be undone.')) {
            setIsLoading(true);
            setError(null);
            const token = getToken();
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setIsLoading(false);
                return;
            }
            try {
                await axios.delete(`${API_URL}/incomes/${incomeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchIncomes(); // Refresh list
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete income. Please try again.');
                console.error("Delete income error:", err);
            }
            setIsLoading(false);
        }
    };

    const toggleForm = () => {
        if (showForm) {
            resetForm();
        } else {
            setShowForm(true);
            setIsEditing(false); // Ensure we are in 'add' mode
             setCurrentIncome({
                id: null,
                description: '',
                amount: '',
                category: 'Salary',
                date: new Date().toISOString().split('T')[0],
                recurring: false,
                frequency: ''
            });
        }
    };

    // Basic inline styles for a cleaner look - ideally, these would be in CSS files or a styling system
    const styles = {
        container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' },
        button: { padding: '10px 15px', margin: '5px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white' },
        buttonDisabled: { backgroundColor: '#ccc' },
        form: { marginBottom: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' },
        inputGroup: { marginBottom: '15px' },
        label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
        input: { width: 'calc(100% - 16px)', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' },
        select: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' },
        error: { color: 'red', backgroundColor: '#ffebee', padding: '10px', borderRadius: '4px', marginBottom: '15px', border: '1px solid red' },
        listItem: { border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
        actions: { marginTop: '10px' },
        loading: { textAlign: 'center', padding: '20px', fontSize: '1.2em' }
    };

    return (
        <div style={styles.container}>
            <h2 style={{ textAlign: 'center', color: '#333' }}>Income Management</h2>
            
            <button onClick={toggleForm} style={{...styles.button, backgroundColor: showForm ? '#dc3545' : '#28a745', marginBottom: '20px' }}>
                {showForm ? 'Cancel' : 'Add New Income'}
            </button>

            {error && <p style={styles.error}>Error: {error}</p>}
            
            {showForm && (
                <form onSubmit={handleSubmit} style={styles.form}>
                    <h3>{isEditing ? 'Edit Income' : 'Add New Income'}</h3>
                    <div style={styles.inputGroup}>
                        <label htmlFor="description" style={styles.label}>Description:</label>
                        <input id="description" type="text" name="description" value={currentIncome.description} onChange={handleInputChange} required style={styles.input}/>
                    </div>
                    <div style={styles.inputGroup}>
                        <label htmlFor="amount" style={styles.label}>Amount:</label>
                        <input id="amount" type="number" name="amount" value={currentIncome.amount} onChange={handleInputChange} required min="0.01" step="0.01" style={styles.input}/>
                    </div>
                    <div style={styles.inputGroup}>
                        <label htmlFor="category" style={styles.label}>Category:</label>
                        <select id="category" name="category" value={currentIncome.category} onChange={handleInputChange} style={styles.select}>
                            <option value="Salary">Salary</option>
                            <option value="Freelance">Freelance</option>
                            <option value="Investment">Investment</option>
                            <option value="Bonus">Bonus</option>
                            <option value="Gift">Gift</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label htmlFor="date" style={styles.label}>Date:</label>
                        <input id="date" type="date" name="date" value={currentIncome.date} onChange={handleInputChange} required style={styles.input}/>
                    </div>
                    <div style={styles.inputGroup}>
                        <label htmlFor="recurring" style={{...styles.label, display: 'inline-block', marginRight: '10px'}}>
                            <input id="recurring" type="checkbox" name="recurring" checked={currentIncome.recurring} onChange={handleInputChange} style={{ marginRight: '5px' }}/>
                            Recurring Income
                        </label>
                    </div>
                    {currentIncome.recurring && (
                        <div style={styles.inputGroup}>
                            <label htmlFor="frequency" style={styles.label}>Frequency:</label>
                            <select id="frequency" name="frequency" value={currentIncome.frequency} onChange={handleInputChange} required={currentIncome.recurring} style={styles.select}>
                                <option value="">Select Frequency</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="bi-weekly">Bi-Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annually">Annually</option>
                            </select>
                        </div>
                    )}
                    <button type="submit" disabled={isLoading} style={{...styles.button, ...(isLoading && styles.buttonDisabled)}}>
                        {isLoading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Income' : 'Add Income')}
                    </button>
                    {isEditing && <button type="button" onClick={resetForm} style={{...styles.button, backgroundColor: '#6c757d'}}>Cancel Edit</button>}
                </form>
            )}

            <h3 style={{ marginTop: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px', color: '#333' }}>Your Incomes</h3>
            {isLoading && incomes.length === 0 && <p style={styles.loading}>Loading incomes...</p>}
            {!isLoading && !error && incomes.length === 0 && <p>No income entries recorded yet. Click "Add New Income" to get started.</p>}
            
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {incomes.map(income => (
                    <li key={income.income_id} style={styles.listItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong style={{ fontSize: '1.1em', color: '#0056b3' }}>{income.description}</strong> - <span style={{ color: 'green', fontWeight: 'bold' }}>${parseFloat(income.amount).toFixed(2)}</span>
                                <br />
                                <small style={{ color: '#555' }}>
                                    Category: {income.category} | Date: {new Date(income.date).toLocaleDateString()}
                                    {income.recurring && ` | Recurring: ${income.frequency}`}
                                </small>
                            </div>
                            <div style={styles.actions}>
                                <button onClick={() => handleEdit(income)} style={{...styles.button, backgroundColor: '#ffc107', color: 'black' }}>Edit</button>
                                <button onClick={() => handleDelete(income.income_id)} disabled={isLoading} style={{...styles.button, backgroundColor: '#dc3545', ...(isLoading && styles.buttonDisabled)}}>Delete</button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default IncomeManagement;

