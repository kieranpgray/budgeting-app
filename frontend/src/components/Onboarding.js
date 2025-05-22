import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Onboarding = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState({
        monthlyIncome: '',
        mainExpenseCategories: [],
        financialGoals: [],
        savingsTarget: ''
    });
    const navigate = useNavigate();

    const totalSteps = 4;

    // Common expense categories to choose from
    const expenseCategories = [
        'Housing', 'Utilities', 'Groceries', 'Transportation', 
        'Dining Out', 'Entertainment', 'Healthcare', 'Shopping',
        'Education', 'Travel', 'Debt Payments', 'Savings', 'Investments'
    ];

    // Common financial goals
    const commonGoals = [
        'Emergency Fund', 'Retirement Savings', 'Down Payment for Home',
        'Vacation', 'Education Fund', 'Debt Payoff', 'New Vehicle',
        'Home Renovation', 'Wedding', 'Starting a Business'
    ];

    const handleCategoryToggle = (category) => {
        setUserData(prev => {
            if (prev.mainExpenseCategories.includes(category)) {
                return {
                    ...prev,
                    mainExpenseCategories: prev.mainExpenseCategories.filter(cat => cat !== category)
                };
            } else {
                return {
                    ...prev,
                    mainExpenseCategories: [...prev.mainExpenseCategories, category]
                };
            }
        });
    };

    const handleGoalToggle = (goal) => {
        setUserData(prev => {
            if (prev.financialGoals.includes(goal)) {
                return {
                    ...prev,
                    financialGoals: prev.financialGoals.filter(g => g !== goal)
                };
            } else {
                return {
                    ...prev,
                    financialGoals: [...prev.financialGoals, goal]
                };
            }
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const nextStep = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            completeOnboarding();
        }
    };

    const prevStep = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const completeOnboarding = async () => {
        setLoading(true);
        try {
            // Here you would typically save the onboarding data to your backend
            // For now, we'll just simulate a delay and store in localStorage
            await new Promise(resolve => setTimeout(resolve, 1000));
            localStorage.setItem('onboardingCompleted', 'true');
            localStorage.setItem('onboardingData', JSON.stringify(userData));
            navigate('/dashboard'); // Redirect to dashboard after onboarding
        } catch (error) {
            console.error('Error saving onboarding data:', error);
        } finally {
            setLoading(false);
        }
    };

    const skipOnboarding = () => {
        localStorage.setItem('onboardingCompleted', 'true');
        navigate('/dashboard');
    };

    // Styles
    const containerStyle = {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '30px',
        fontFamily: 'Arial, sans-serif'
    };

    const headerStyle = {
        textAlign: 'center',
        marginBottom: '30px'
    };

    const stepIndicatorStyle = {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '30px'
    };

    const stepDotStyle = (isActive, isCompleted) => ({
        width: '15px',
        height: '15px',
        borderRadius: '50%',
        backgroundColor: isActive ? '#007bff' : (isCompleted ? '#28a745' : '#e9ecef'),
        margin: '0 5px',
        transition: 'background-color 0.3s'
    });

    const formGroupStyle = {
        marginBottom: '20px'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold'
    };

    const inputStyle = {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '16px'
    };

    const buttonContainerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '30px'
    };

    const buttonStyle = (isPrimary) => ({
        padding: '10px 20px',
        backgroundColor: isPrimary ? '#007bff' : '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px'
    });

    const skipButtonStyle = {
        background: 'none',
        border: 'none',
        color: '#6c757d',
        textDecoration: 'underline',
        cursor: 'pointer',
        marginTop: '20px'
    };

    const tagContainerStyle = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginTop: '10px'
    };

    const tagStyle = (isSelected) => ({
        padding: '8px 15px',
        backgroundColor: isSelected ? '#007bff' : '#e9ecef',
        color: isSelected ? 'white' : '#333',
        borderRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    });

    // Render different steps
    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h2>Welcome to Your Financial Journey!</h2>
                        <p>Let's set up your profile to help you manage your finances better. We'll ask a few questions to personalize your experience.</p>
                        
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>What's your approximate monthly income?</label>
                            <input
                                type="number"
                                name="monthlyIncome"
                                value={userData.monthlyIncome}
                                onChange={handleInputChange}
                                placeholder="Enter amount"
                                style={inputStyle}
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h2>What are your main expense categories?</h2>
                        <p>Select the categories that represent your regular expenses.</p>
                        
                        <div style={tagContainerStyle}>
                            {expenseCategories.map((category, index) => (
                                <div
                                    key={index}
                                    style={tagStyle(userData.mainExpenseCategories.includes(category))}
                                    onClick={() => handleCategoryToggle(category)}
                                >
                                    {category}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div>
                        <h2>What are your financial goals?</h2>
                        <p>Select any goals you're working towards.</p>
                        
                        <div style={tagContainerStyle}>
                            {commonGoals.map((goal, index) => (
                                <div
                                    key={index}
                                    style={tagStyle(userData.financialGoals.includes(goal))}
                                    onClick={() => handleGoalToggle(goal)}
                                >
                                    {goal}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div>
                        <h2>Almost Done!</h2>
                        <p>Let's set a monthly savings target to help you reach your goals.</p>
                        
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Monthly savings target</label>
                            <input
                                type="number"
                                name="savingsTarget"
                                value={userData.savingsTarget}
                                onChange={handleInputChange}
                                placeholder="Enter amount"
                                style={inputStyle}
                            />
                        </div>
                        
                        <p>After completing this step, you'll be ready to start using the full features of your budgeting app!</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1>Set Up Your Budget</h1>
            </div>
            
            <div style={stepIndicatorStyle}>
                {[...Array(totalSteps)].map((_, index) => (
                    <div 
                        key={index}
                        style={stepDotStyle(index + 1 === step, index + 1 < step)}
                    />
                ))}
            </div>
            
            {renderStep()}
            
            <div style={buttonContainerStyle}>
                {step > 1 && (
                    <button 
                        onClick={prevStep} 
                        style={buttonStyle(false)}
                        disabled={loading}
                    >
                        Back
                    </button>
                )}
                {step === 1 && <div />}
                
                <button 
                    onClick={nextStep} 
                    style={buttonStyle(true)}
                    disabled={loading}
                >
                    {step === totalSteps ? (loading ? 'Saving...' : 'Complete Setup') : 'Next'}
                </button>
            </div>
            
            <div style={{ textAlign: 'center' }}>
                <button 
                    onClick={skipOnboarding} 
                    style={skipButtonStyle}
                    disabled={loading}
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
};

export default Onboarding;
