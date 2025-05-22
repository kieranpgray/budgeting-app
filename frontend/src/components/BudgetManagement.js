import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

const BudgetManagement = () => {
    const [budgets, setBudgets] = useState([]);
    const [budgetSummary, setBudgetSummary] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentBudget, setCurrentBudget] = useState({
        category: "Groceries",
        amount: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0], // Default to one month from today
        notes: ""
    });

    const getToken = () => localStorage.getItem("token");

    const fetchBudgetsAndSummary = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const token = getToken();
        try {
            const [budgetsRes, summaryRes] = await Promise.all([
                axios.get(`${API_URL}/budgets`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/budgets/summary`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setBudgets(budgetsRes.data);
            setBudgetSummary(summaryRes.data.summary || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to fetch budget data");
            console.error("Fetch budget data error:", err);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchBudgetsAndSummary();
    }, [fetchBudgetsAndSummary]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentBudget(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const token = getToken();
        const method = isEditing ? "put" : "post";
        const url = isEditing ? `${API_URL}/budgets/${currentBudget.budget_id}` : `${API_URL}/budgets`;

        try {
            await axios[method](url, currentBudget, { headers: { Authorization: `Bearer ${token}` } });
            fetchBudgetsAndSummary();
            setShowForm(false);
            setIsEditing(false);
            setCurrentBudget({ category: "Groceries", amount: "", start_date: new Date().toISOString().split("T")[0], end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0], notes: "" });
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEditing ? "update" : "add"} budget`);
            console.error("Submit budget error:", err);
        }
        setIsLoading(false);
    };

    const handleEdit = (budget) => {
        setCurrentBudget({
            ...budget,
            start_date: new Date(budget.start_date).toISOString().split("T")[0],
            end_date: new Date(budget.end_date).toISOString().split("T")[0]
        });
        setIsEditing(true);
        setShowForm(true);
    };

    const handleDelete = async (budgetId) => {
        if (window.confirm("Are you sure you want to delete this budget?")) {
            setIsLoading(true);
            const token = getToken();
            try {
                await axios.delete(`${API_URL}/budgets/${budgetId}`, { headers: { Authorization: `Bearer ${token}` } });
                fetchBudgetsAndSummary();
            } catch (err) {
                setError(err.response?.data?.message || "Failed to delete budget");
            }
            setIsLoading(false);
        }
    };

    const toggleForm = () => {
        setShowForm(!showForm);
        setIsEditing(false);
        setCurrentBudget({ category: "Groceries", amount: "", start_date: new Date().toISOString().split("T")[0], end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0], notes: "" });
    };

    const commonInputStyle = { width: "100%", padding: "8px", marginBottom: "10px", boxSizing: "border-box" };
    const formStyle = { marginBottom: "20px", padding: "15px", border: "1px solid #ccc", borderRadius: "5px" };
    const buttonStyle = { padding: "10px 15px", marginRight: "10px", cursor: "pointer" };
    const listStyle = { listStyleType: "none", padding: 0 };
    const listItemStyle = { border: "1px solid #eee", padding: "10px", marginBottom: "10px", borderRadius: "5px" };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h2>Budget Management</h2>
            <button onClick={toggleForm} style={{ ...buttonStyle, marginBottom: "15px" }}>
                {showForm ? (isEditing ? "Cancel Edit Budget" : "Cancel Add Budget") : "Add New Budget"}
            </button>

            {error && <p style={{ color: "red" }}>Error: {error}</p>}
            {isLoading && <p>Loading...</p>}

            {showForm && (
                <form onSubmit={handleSubmit} style={formStyle}>
                    <h4>{isEditing ? "Edit Budget" : "Add New Budget"}</h4>
                    <div><label>Category:</label>
                        <input type="text" name="category" value={currentBudget.category} onChange={handleInputChange} required style={commonInputStyle} placeholder="e.g., Groceries, Dining Out, Transport"/>
                    </div>
                    <div><label>Amount ($):</label><input type="number" name="amount" value={currentBudget.amount} onChange={handleInputChange} required min="0.01" step="0.01" style={commonInputStyle} /></div>
                    <div><label>Start Date:</label><input type="date" name="start_date" value={currentBudget.start_date} onChange={handleInputChange} required style={commonInputStyle} /></div>
                    <div><label>End Date:</label><input type="date" name="end_date" value={currentBudget.end_date} onChange={handleInputChange} required style={commonInputStyle} /></div>
                    <div><label>Notes (Optional):</label><textarea name="notes" value={currentBudget.notes} onChange={handleInputChange} style={commonInputStyle}></textarea></div>
                    <button type="submit" disabled={isLoading} style={buttonStyle}>{isEditing ? "Update Budget" : "Add Budget"}</button>
                    {isEditing && <button type="button" onClick={toggleForm} style={buttonStyle}>Cancel</button>}
                </form>
            )}

            <h3>Active Budget Summary</h3>
            {budgetSummary.length === 0 && !isLoading && <p>No active budgets for the current period, or no expenses logged against them.</p>}
            {budgetSummary.length > 0 && (
                <ul style={listStyle}>
                    {budgetSummary.map((item, index) => (
                        <li key={index} style={listItemStyle}>
                            <strong>{item.category}</strong>: Spent ${item.spent} of ${item.budgeted} (Remaining: ${item.remaining})
                            <br />
                            <small>Period: {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</small>
                            <div style={{ width: "100%", backgroundColor: "#e9ecef", borderRadius: "5px", marginTop: "5px" }}>
                                <div style={{
                                    width: `${(parseFloat(item.spent) / parseFloat(item.budgeted) * 100)}%`,
                                    backgroundColor: parseFloat(item.spent) > parseFloat(item.budgeted) ? "#dc3545" : "#28a745",
                                    padding: "2px 0",
                                    textAlign: "center",
                                    color: "white",
                                    borderRadius: "5px",
                                    minHeight: "1.2em",
                                    lineHeight: "1.2em"
                                }}>
                                    {Math.round((parseFloat(item.spent) / parseFloat(item.budgeted) * 100))}% 
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <h3 style={{ marginTop: "30px" }}>All Budgets</h3>
            {budgets.length === 0 && !isLoading && <p>No budgets created yet.</p>}
            <ul style={listStyle}>
                {budgets.map(budget => (
                    <li key={budget.budget_id} style={listItemStyle}>
                        <strong>{budget.category}</strong>: ${parseFloat(budget.amount).toFixed(2)}
                        <br />
                        Period: {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                        {budget.notes && <p style={{ fontSize: "0.9em", color: "#555" }}>Notes: {budget.notes}</p>}
                        <div style={{ marginTop: "5px" }}>
                            <button onClick={() => handleEdit(budget)} style={{ ...buttonStyle, padding: "5px 10px" }}>Edit</button>
                            <button onClick={() => handleDelete(budget.budget_id)} style={{ ...buttonStyle, padding: "5px 10px", backgroundColor: "#dc3545", color: "white" }}>Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default BudgetManagement;

