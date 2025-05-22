import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

const NetWorthManagement = () => {
    const [assets, setAssets] = useState([]);
    const [liabilities, setLiabilities] = useState([]);
    const [netWorthSummary, setNetWorthSummary] = useState({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // States for asset form
    const [showAssetForm, setShowAssetForm] = useState(false);
    const [isEditingAsset, setIsEditingAsset] = useState(false);
    const [currentAsset, setCurrentAsset] = useState({
        description: "",
        value: "",
        category: "Cash",
        notes: ""
    });

    // States for liability form
    const [showLiabilityForm, setShowLiabilityForm] = useState(false);
    const [isEditingLiability, setIsEditingLiability] = useState(false);
    const [currentLiability, setCurrentLiability] = useState({
        description: "",
        amount: "",
        category: "Credit Card",
        interest_rate: "",
        notes: ""
    });

    const getToken = () => localStorage.getItem("token");

    const fetchNetWorthData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const token = getToken();
        try {
            const [assetsRes, liabilitiesRes, summaryRes] = await Promise.all([
                axios.get(`${API_URL}/networth/assets`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/networth/liabilities`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/networth/summary`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setAssets(assetsRes.data);
            setLiabilities(liabilitiesRes.data);
            setNetWorthSummary(summaryRes.data);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to fetch net worth data");
            console.error("Fetch net worth data error:", err);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchNetWorthData();
    }, [fetchNetWorthData]);

    // Asset form handlers
    const handleAssetInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentAsset(prev => ({ ...prev, [name]: value }));
    };

    const handleAssetSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const token = getToken();
        const method = isEditingAsset ? "put" : "post";
        const url = isEditingAsset ? `${API_URL}/networth/assets/${currentAsset.asset_id}` : `${API_URL}/networth/assets`;

        try {
            await axios[method](url, currentAsset, { headers: { Authorization: `Bearer ${token}` } });
            fetchNetWorthData();
            setShowAssetForm(false);
            setIsEditingAsset(false);
            setCurrentAsset({ description: "", value: "", category: "Cash", notes: "" });
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEditingAsset ? "update" : "add"} asset`);
        }
        setIsLoading(false);
    };

    const handleEditAsset = (asset) => {
        setCurrentAsset(asset);
        setIsEditingAsset(true);
        setShowAssetForm(true);
    };

    const handleDeleteAsset = async (assetId) => {
        if (window.confirm("Are you sure you want to delete this asset?")) {
            setIsLoading(true);
            const token = getToken();
            try {
                await axios.delete(`${API_URL}/networth/assets/${assetId}`, { headers: { Authorization: `Bearer ${token}` } });
                fetchNetWorthData();
            } catch (err) {
                setError(err.response?.data?.message || "Failed to delete asset");
            }
            setIsLoading(false);
        }
    };

    const toggleAssetForm = () => {
        setShowAssetForm(!showAssetForm);
        setIsEditingAsset(false);
        setCurrentAsset({ description: "", value: "", category: "Cash", notes: "" });
    };

    // Liability form handlers
    const handleLiabilityInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentLiability(prev => ({ ...prev, [name]: value }));
    };

    const handleLiabilitySubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const token = getToken();
        const method = isEditingLiability ? "put" : "post";
        const url = isEditingLiability ? `${API_URL}/networth/liabilities/${currentLiability.liability_id}` : `${API_URL}/networth/liabilities`;

        try {
            await axios[method](url, currentLiability, { headers: { Authorization: `Bearer ${token}` } });
            fetchNetWorthData();
            setShowLiabilityForm(false);
            setIsEditingLiability(false);
            setCurrentLiability({ description: "", amount: "", category: "Credit Card", interest_rate: "", notes: "" });
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEditingLiability ? "update" : "add"} liability`);
        }
        setIsLoading(false);
    };

    const handleEditLiability = (liability) => {
        setCurrentLiability(liability);
        setIsEditingLiability(true);
        setShowLiabilityForm(true);
    };

    const handleDeleteLiability = async (liabilityId) => {
        if (window.confirm("Are you sure you want to delete this liability?")) {
            setIsLoading(true);
            const token = getToken();
            try {
                await axios.delete(`${API_URL}/networth/liabilities/${liabilityId}`, { headers: { Authorization: `Bearer ${token}` } });
                fetchNetWorthData();
            } catch (err) {
                setError(err.response?.data?.message || "Failed to delete liability");
            }
            setIsLoading(false);
        }
    };

    const toggleLiabilityForm = () => {
        setShowLiabilityForm(!showLiabilityForm);
        setIsEditingLiability(false);
        setCurrentLiability({ description: "", amount: "", category: "Credit Card", interest_rate: "", notes: "" });
    };

    const commonInputStyle = { width: "100%", padding: "8px", marginBottom: "10px", boxSizing: "border-box" };
    const formStyle = { marginBottom: "20px", padding: "15px", border: "1px solid #ccc", borderRadius: "5px" };
    const buttonStyle = { padding: "10px 15px", marginRight: "10px", cursor: "pointer" };
    const listStyle = { listStyleType: "none", padding: 0 };
    const listItemStyle = { border: "1px solid #eee", padding: "10px", marginBottom: "10px", borderRadius: "5px" };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h2>Net Worth Management</h2>

            {error && <p style={{ color: "red" }}>Error: {error}</p>}
            {isLoading && <p>Loading...</p>}

            <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #007bff", borderRadius: "5px", backgroundColor: "#f0f8ff" }}>
                <h3>Summary</h3>
                <p>Total Assets: ${parseFloat(netWorthSummary.totalAssets).toFixed(2)}</p>
                <p>Total Liabilities: ${parseFloat(netWorthSummary.totalLiabilities).toFixed(2)}</p>
                <p><strong>Net Worth: ${parseFloat(netWorthSummary.netWorth).toFixed(2)}</strong></p>
            </div>

            {/* Assets Section */}
            <div style={{ marginBottom: "30px" }}>
                <h3>Assets</h3>
                <button onClick={toggleAssetForm} style={{ ...buttonStyle, marginBottom: "15px" }}>
                    {showAssetForm ? (isEditingAsset ? "Cancel Edit Asset" : "Cancel Add Asset") : "Add New Asset"}
                </button>
                {showAssetForm && (
                    <form onSubmit={handleAssetSubmit} style={formStyle}>
                        <h4>{isEditingAsset ? "Edit Asset" : "Add New Asset"}</h4>
                        <div><label>Description:</label><input type="text" name="description" value={currentAsset.description} onChange={handleAssetInputChange} required style={commonInputStyle} /></div>
                        <div><label>Value ($):</label><input type="number" name="value" value={currentAsset.value} onChange={handleAssetInputChange} required min="0" step="0.01" style={commonInputStyle} /></div>
                        <div><label>Category:</label>
                            <select name="category" value={currentAsset.category} onChange={handleAssetInputChange} style={commonInputStyle}>
                                <option value="Cash">Cash & Equivalents</option>
                                <option value="Investments">Investments (Stocks, Bonds)</option>
                                <option value="Real Estate">Real Estate</option>
                                <option value="Vehicles">Vehicles</option>
                                <option value="Retirement">Retirement Accounts (401k, IRA)</option>
                                <option value="Other">Other Valuables</option>
                            </select>
                        </div>
                        <div><label>Notes (Optional):</label><textarea name="notes" value={currentAsset.notes} onChange={handleAssetInputChange} style={commonInputStyle}></textarea></div>
                        <button type="submit" disabled={isLoading} style={buttonStyle}>{isEditingAsset ? "Update Asset" : "Add Asset"}</button>
                        {isEditingAsset && <button type="button" onClick={toggleAssetForm} style={buttonStyle}>Cancel</button>}
                    </form>
                )}
                <ul style={listStyle}>
                    {assets.map(asset => (
                        <li key={asset.asset_id} style={listItemStyle}>
                            <strong>{asset.description}</strong>: ${parseFloat(asset.value).toFixed(2)} ({asset.category})
                            {asset.notes && <p style={{ fontSize: "0.9em", color: "#555" }}>Notes: {asset.notes}</p>}
                            <div style={{ marginTop: "5px" }}>
                                <button onClick={() => handleEditAsset(asset)} style={{ ...buttonStyle, padding: "5px 10px" }}>Edit</button>
                                <button onClick={() => handleDeleteAsset(asset.asset_id)} style={{ ...buttonStyle, padding: "5px 10px", backgroundColor: "#dc3545", color: "white" }}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
                {assets.length === 0 && !isLoading && <p>No assets recorded yet.</p>}
            </div>

            {/* Liabilities Section */}
            <div>
                <h3>Liabilities</h3>
                <button onClick={toggleLiabilityForm} style={{ ...buttonStyle, marginBottom: "15px" }}>
                    {showLiabilityForm ? (isEditingLiability ? "Cancel Edit Liability" : "Cancel Add Liability") : "Add New Liability"}
                </button>
                {showLiabilityForm && (
                    <form onSubmit={handleLiabilitySubmit} style={formStyle}>
                        <h4>{isEditingLiability ? "Edit Liability" : "Add New Liability"}</h4>
                        <div><label>Description:</label><input type="text" name="description" value={currentLiability.description} onChange={handleLiabilityInputChange} required style={commonInputStyle} /></div>
                        <div><label>Amount Owed ($):</label><input type="number" name="amount" value={currentLiability.amount} onChange={handleLiabilityInputChange} required min="0" step="0.01" style={commonInputStyle} /></div>
                        <div><label>Category:</label>
                             <select name="category" value={currentLiability.category} onChange={handleLiabilityInputChange} style={commonInputStyle}>
                                <option value="Credit Card">Credit Card Debt</option>
                                <option value="Mortgage">Mortgage</option>
                                <option value="Student Loan">Student Loan</option>
                                <option value="Auto Loan">Auto Loan</option>
                                <option value="Personal Loan">Personal Loan</option>
                                <option value="Medical Debt">Medical Debt</option>
                                <option value="Other">Other Debt</option>
                            </select>
                        </div>
                        <div><label>Interest Rate (% p.a., Optional):</label><input type="number" name="interest_rate" value={currentLiability.interest_rate || ""} onChange={handleLiabilityInputChange} min="0" step="0.01" style={commonInputStyle} /></div>
                        <div><label>Notes (Optional):</label><textarea name="notes" value={currentLiability.notes} onChange={handleLiabilityInputChange} style={commonInputStyle}></textarea></div>
                        <button type="submit" disabled={isLoading} style={buttonStyle}>{isEditingLiability ? "Update Liability" : "Add Liability"}</button>
                        {isEditingLiability && <button type="button" onClick={toggleLiabilityForm} style={buttonStyle}>Cancel</button>}
                    </form>
                )}
                <ul style={listStyle}>
                    {liabilities.map(liability => (
                        <li key={liability.liability_id} style={listItemStyle}>
                            <strong>{liability.description}</strong>: ${parseFloat(liability.amount).toFixed(2)} ({liability.category})
                            {liability.interest_rate && ` - ${parseFloat(liability.interest_rate).toFixed(2)}%`}
                            {liability.notes && <p style={{ fontSize: "0.9em", color: "#555" }}>Notes: {liability.notes}</p>}
                            <div style={{ marginTop: "5px" }}>
                                <button onClick={() => handleEditLiability(liability)} style={{ ...buttonStyle, padding: "5px 10px" }}>Edit</button>
                                <button onClick={() => handleDeleteLiability(liability.liability_id)} style={{ ...buttonStyle, padding: "5px 10px", backgroundColor: "#dc3545", color: "white" }}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
                {liabilities.length === 0 && !isLoading && <p>No liabilities recorded yet.</p>}
            </div>
        </div>
    );
};

export default NetWorthManagement;

