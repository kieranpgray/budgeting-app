import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

const FinancialGoalManagement = () => {
    const [goals, setGoals] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentGoal, setCurrentGoal] = useState({
        name: "",
        description: "",
        target_amount: "",
        current_amount: "0",
        target_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0], // Default to one year from today
        priority: "Medium",
        status: "In Progress"
    });

    const getToken = () => localStorage.getItem("token");

    const fetchGoals = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const token = getToken();
        try {
            const response = await axios.get(`${API_URL}/financial-goals`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGoals(response.data);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to fetch financial goals");
            console.error("Fetch goals error:", err);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentGoal(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const token = getToken();
        const method = isEditing ? "put" : "post";
        const url = isEditing ? `${API_URL}/financial-goals/${currentGoal.goal_id}` : `${API_URL}/financial-goals`;

        try {
            await axios[method](url, currentGoal, { headers: { Authorization: `Bearer ${token}` } });
            fetchGoals();
            setShowForm(false);
            setIsEditing(false);
            setCurrentGoal({ name: "", description: "", target_amount: "", current_amount: "0", target_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0], priority: "Medium", status: "In Progress" });
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEditing ? "update" : "add"} financial goal`);
            console.error("Submit goal error:", err);
        }
        setIsLoading(false);
    };

    const handleEdit = (goal) => {
        setCurrentGoal({
            ...goal,
            target_date: new Date(goal.target_date).toISOString().split("T")[0],
            current_amount: goal.current_amount || "0" // Ensure current_amount is a string for the form
        });
        setIsEditing(true);
        setShowForm(true);
    };

    const handleDelete = async (goalId) => {
        if (window.confirm("Are you sure you want to delete this financial goal?")) {
            setIsLoading(true);
            const token = getToken();
            try {
                await axios.delete(`${API_URL}/financial-goals/${goalId}`, { headers: { Authorization: `Bearer ${token}` } });
                fetchGoals();
            } catch (err) {
                setError(err.response?.data?.message || "Failed to delete financial goal");
            }
            setIsLoading(false);
        }
    };

    const toggleForm = () => {
        setShowForm(!showForm);
        setIsEditing(false);
        setCurrentGoal({ name: "", description: "", target_amount: "", current_amount: "0", target_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0], priority: "Medium", status: "In Progress" });
    };

    const calculateProgress = (current, target) => {
        if (parseFloat(target) <= 0) return 0;
        return (parseFloat(current) / parseFloat(target) * 100).toFixed(1);
    };

    const commonInputStyle = { width: "100%", padding: "8px", marginBottom: "10px", boxSizing: "border-box" };
    const formStyle = { marginBottom: "20px", padding: "15px", border: "1px solid #ccc", borderRadius: "5px" };
    const buttonStyle = { padding: "10px 15px", marginRight: "10px", cursor: "pointer" };
    const listStyle = { listStyleType: "none", padding: 0 };
    const listItemStyle = { border: "1px solid #eee", padding: "15px", marginBottom: "10px", borderRadius: "5px" };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h2>Financial Goals</h2>
            <button onClick={toggleForm} style={{ ...buttonStyle, marginBottom: "15px" }}>
                {showForm ? (isEditing ? "Cancel Edit Goal" : "Cancel Add Goal") : "Add New Goal"}
            </button>

            {error && <p style={{ color: "red" }}>Error: {error}</p>}
            {isLoading && <p>Loading...</p>}

            {showForm && (
                <form onSubmit={handleSubmit} style={formStyle}>
                    <h4>{isEditing ? "Edit Financial Goal" : "Add New Financial Goal"}</h4>
                    <div><label>Goal Name:</label><input type="text" name="name" value={currentGoal.name} onChange={handleInputChange} required style={commonInputStyle} placeholder="e.g., Emergency Fund, Vacation to Hawaii"/></div>
                    <div><label>Description (Optional):</label><textarea name="description" value={currentGoal.description} onChange={handleInputChange} style={commonInputStyle}></textarea></div>
                    <div><label>Target Amount ($):</label><input type="number" name="target_amount" value={currentGoal.target_amount} onChange={handleInputChange} required min="0.01" step="0.01" style={commonInputStyle} /></div>
                    <div><label>Current Amount Saved ($):</label><input type="number" name="current_amount" value={currentGoal.current_amount} onChange={handleInputChange} required min="0" step="0.01" style={commonInputStyle} /></div>
                    <div><label>Target Date:</label><input type="date" name="target_date" value={currentGoal.target_date} onChange={handleInputChange} required style={commonInputStyle} /></div>
                    <div><label>Priority:</label>
                        <select name="priority" value={currentGoal.priority} onChange={handleInputChange} style={commonInputStyle}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                    <div><label>Status:</label>
                        <select name="status" value={currentGoal.status} onChange={handleInputChange} style={commonInputStyle}>
                            <option value="In Progress">In Progress</option>
                            <option value="Achieved">Achieved</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                    <button type="submit" disabled={isLoading} style={buttonStyle}>{isEditing ? "Update Goal" : "Add Goal"}</button>
                    {isEditing && <button type="button" onClick={toggleForm} style={buttonStyle}>Cancel</button>}
                </form>
            )}

            <h3>Your Goals</h3>
            {goals.length === 0 && !isLoading && <p>No financial goals set yet.</p>}
            <ul style={listStyle}>
                {goals.map(goal => (
                    <li key={goal.goal_id} style={listItemStyle}>
                        <strong>{goal.name}</strong> (Status: {goal.status}, Priority: {goal.priority})
                        <p>{goal.description}</p>
                        <p>Target: ${parseFloat(goal.target_amount).toFixed(2)} | Saved: ${parseFloat(goal.current_amount).toFixed(2)}</p>
                        <p>Target Date: {new Date(goal.target_date).toLocaleDateString()}</p>
                        <div style={{ width: "100%", backgroundColor: "#e9ecef", borderRadius: "5px", marginTop: "5px", marginBottom: "10px" }}>
                            <div style={{
                                width: `${calculateProgress(goal.current_amount, goal.target_amount)}%`,
                                backgroundColor: goal.status === "Achieved" ? "#28a745" : (parseFloat(goal.current_amount) >= parseFloat(goal.target_amount) ? "#28a745" : "#007bff"),
                                padding: "5px 0",
                                textAlign: "center",
                                color: "white",
                                borderRadius: "5px",
                                minHeight: "1.5em",
                                lineHeight: "1.5em"
                            }}>
                                {calculateProgress(goal.current_amount, goal.target_amount)}%
                            </div>
                        </div>
                        <div style={{ marginTop: "5px" }}>
                            <button onClick={() => handleEdit(goal)} style={{ ...buttonStyle, padding: "5px 10px" }}>Edit</button>
                            <button onClick={() => handleDelete(goal.goal_id)} style={{ ...buttonStyle, padding: "5px 10px", backgroundColor: "#dc3545", color: "white" }}>Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FinancialGoalManagement;

