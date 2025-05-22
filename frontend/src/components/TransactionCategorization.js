import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

// This component might be integrated into Expense/Income management or a dedicated transactions page
const TransactionCategorization = ({ transaction, type, onCategoryUpdate }) => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(transaction.category || "");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const getToken = () => localStorage.getItem("token");

    const fetchCategories = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = getToken();
            const response = await axios.get(`${API_URL}/categories`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(response.data || []);
            if (!transaction.category && response.data && response.data.length > 0) {
                // Optionally default to the first category if none is set
                // setSelectedCategory(response.data[0]); 
            }
        } catch (err) {
            setError("Failed to fetch categories");
            console.error("Fetch categories error:", err);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        setSelectedCategory(transaction.category || "");
    }, [transaction.category]);

    const handleCategoryChange = async (e) => {
        const newCategory = e.target.value;
        setSelectedCategory(newCategory);
        setIsLoading(true);
        setError(null);
        const token = getToken();
        const endpointType = type === "income" ? "incomes" : "expenses";
        const transactionId = type === "income" ? transaction.income_id : transaction.expense_id;

        try {
            const response = await axios.put(
                `${API_URL}/categories/${endpointType}/${transactionId}`,
                { category: newCategory },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (onCategoryUpdate) {
                onCategoryUpdate(response.data); // Pass updated transaction back to parent
            }
            // Optionally show a success message
        } catch (err) {
            setError(err.response?.data?.message || `Failed to update category for ${type}`);
            console.error(`Update ${type} category error:`, err);
            setSelectedCategory(transaction.category || ""); // Revert on error
        }
        setIsLoading(false);
    };

    if (!transaction) return null;

    return (
        <div style={{ marginTop: "5px" }}>
            <label htmlFor={`category-select-${type}-${transaction.id || transaction.expense_id || transaction.income_id}`} style={{ marginRight: "5px" }}>Category:</label>
            <select 
                id={`category-select-${type}-${transaction.id || transaction.expense_id || transaction.income_id}`}
                value={selectedCategory}
                onChange={handleCategoryChange}
                disabled={isLoading}
                style={{ padding: "5px" }}
            >
                <option value="">Uncategorized</option>
                {categories.map((cat, index) => (
                    <option key={index} value={cat}>{cat}</option>
                ))}
            </select>
            {isLoading && <span style={{ marginLeft: "10px" }}>Saving...</span>}
            {error && <p style={{ color: "red", fontSize: "0.9em" }}>{error}</p>}
        </div>
    );
};

export default TransactionCategorization;

// Example usage within an ExpenseListItem or IncomeListItem component:
// import TransactionCategorization from "./TransactionCategorization";
// ... inside your item component render ...
// <TransactionCategorization 
//    transaction={expense} // or income object
//    type="expense" // or "income"
//    onCategoryUpdate={(updatedTransaction) => {
//        // Logic to update this specific transaction in your local state
//        console.log("Transaction updated:", updatedTransaction);
//        // e.g., updateExpensesList(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
//    }}
// />

