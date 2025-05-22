import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const DataIOManagement = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [importType, setImportType] = useState('expenses'); // 'expenses' or 'incomes'
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const getToken = () => localStorage.getItem('token');

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setMessage('');
        setError('');
    };

    const handleImportTypeChange = (event) => {
        setImportType(event.target.value);
    };

    const handleImport = async () => {
        if (!selectedFile) {
            setError('Please select a CSV file to import.');
            return;
        }
        setIsLoading(true);
        setMessage('');
        setError('');
        const token = getToken();
        if (!token) {
            setError('Authentication token not found. Please log in.');
            setIsLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('csvFile', selectedFile);

        const url = `${API_URL}/data/${importType}/import`;

        try {
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });
            setMessage(`Import successful: ${response.data.imported} ${importType} imported, ${response.data.skipped} skipped.`);
            if (response.data.errors && response.data.errors.length > 0) {
                setError(`Import completed with some errors: \n${response.data.errors.join('\n')}`);
            }
            setSelectedFile(null); // Clear the file input
            document.getElementById('csv-file-input').value = ''; // Reset file input
        } catch (err) {
            setError(err.response?.data?.message || `Failed to import ${importType}. Please check the file format and try again.`);
            console.error(`Import ${importType} error:`, err);
        }
        setIsLoading(false);
    };

    const handleExport = async (exportType) => {
        setIsLoading(true);
        setMessage('');
        setError('');
        const token = getToken();
        if (!token) {
            setError('Authentication token not found. Please log in.');
            setIsLoading(false);
            return;
        }

        const url = `${API_URL}/data/${exportType}/export`;

        try {
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob', // Important for file download
            });

            const blob = new Blob([response.data], { type: 'text/csv' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            setMessage(`${exportType} data exported successfully.`);
        } catch (err) {
            setError(err.response?.data?.message || `Failed to export ${exportType}.`);
            console.error(`Export ${exportType} error:`, err);
        }
        setIsLoading(false);
    };

    // Basic inline styles - ideally use a CSS file or styling system
    const styles = {
        container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' },
        section: { marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' },
        title: { marginTop: '0', color: '#333' },
        button: { padding: '10px 15px', margin: '5px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white' },
        buttonDisabled: { backgroundColor: '#ccc' },
        select: { padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' },
        fileInput: { marginBottom: '10px', display: 'block' },
        message: { color: 'green', backgroundColor: '#e6ffed', padding: '10px', borderRadius: '4px', marginBottom: '15px', border: '1px solid green' },
        error: { color: 'red', backgroundColor: '#ffebee', padding: '10px', borderRadius: '4px', marginBottom: '15px', border: '1px solid red' },
        loading: { textAlign: 'center', padding: '10px', fontSize: '1.1em' }
    };

    return (
        <div style={styles.container}>
            <h2 style={{ textAlign: 'center', color: '#333' }}>Data Import/Export</h2>

            {message && <p style={styles.message}>{message}</p>}
            {error && <p style={styles.error}>{error}</p>}
            {isLoading && <p style={styles.loading}>Processing...</p>}

            <div style={styles.section}>
                <h3 style={styles.title}>Import Data from CSV</h3>
                <select value={importType} onChange={handleImportTypeChange} style={styles.select} disabled={isLoading}>
                    <option value="expenses">Expenses</option>
                    <option value="incomes">Incomes</option>
                </select>
                <input id="csv-file-input" type="file" accept=".csv" onChange={handleFileChange} style={styles.fileInput} disabled={isLoading} />
                <button onClick={handleImport} disabled={isLoading || !selectedFile} style={{...styles.button, ...((isLoading || !selectedFile) && styles.buttonDisabled)}}>
                    {isLoading ? 'Importing...' : `Import ${importType.charAt(0).toUpperCase() + importType.slice(1)}`}
                </button>
            </div>

            <div style={styles.section}>
                <h3 style={styles.title}>Export Data to CSV</h3>
                <button onClick={() => handleExport('expenses')} disabled={isLoading} style={{...styles.button, ...(isLoading && styles.buttonDisabled)}}>
                    {isLoading ? 'Exporting...' : 'Export Expenses'}
                </button>
                <button onClick={() => handleExport('incomes')} disabled={isLoading} style={{...styles.button, ...(isLoading && styles.buttonDisabled)}}>
                    {isLoading ? 'Exporting...' : 'Export Incomes'}
                </button>
            </div>
        </div>
    );
};

export default DataIOManagement;

