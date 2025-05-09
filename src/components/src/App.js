import React, { useState } from 'react';

const CashewTradingApp = () => {
  // State for all inputs and calculations
  const [inputs, setInputs] = useState({
    localPriceNaira: 0,
    existingStockCnfCost: 0,
    buyerBidUsd: 0,
    fxRateNairaToUsd: 0,
    amountRemitted: 0,
    existingStockQuantity: 0
  });

  const [results, setResults] = useState({
    localPriceUsd: 0,
    relevantCostForMargin: 0,
    grossMarginPercent: 0,
    sellSignal: '',
    sellQuantity: 0,
    potentialPurchaseQty: 0,
    targetBuyPrices: {
      sixPercent: 0,
      sevenPercent: 0,
      eightPercent: 0
    }
  });
  
  const [history, setHistory] = useState([]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs({
      ...inputs,
      [name]: parseFloat(value) || 0
    });
  };

  // Calculate local price in USD
  const calculateLocalPriceUsd = () => {
    if (!inputs.localPriceNaira || !inputs.fxRateNairaToUsd) return 0;
    return inputs.localPriceNaira / inputs.fxRateNairaToUsd;
  };

  // Calculate gross margin
  const calculateGrossMargin = () => {
    const localPriceUsd = calculateLocalPriceUsd();
    const relevantCost = Math.max(inputs.existingStockCnfCost, localPriceUsd);
    
    // Check if buyer bid is provided
    if (!inputs.buyerBidUsd || inputs.buyerBidUsd <= 0) {
      return {
        localPriceUsd,
        relevantCost,
        grossMarginPercent: 0
      };
    }
    
    const grossMargin = ((inputs.buyerBidUsd - relevantCost) / inputs.buyerBidUsd) * 100;
    
    return {
      localPriceUsd,
      relevantCost,
      grossMarginPercent: grossMargin
    };
  };

  // Determine sell signal and quantity
  const determineSellSignal = (grossMargin) => {
    if (grossMargin < 6) {
      return { signal: "HOLD - Manual Override Required", quantity: 0 };
    } else if (grossMargin >= 6 && grossMargin < 7) {
      return { signal: "SELL", quantity: 100 };
    } else if (grossMargin >= 7 && grossMargin < 9) {
      return { signal: "SELL", quantity: 200 };
    } else {
      return { signal: "SELL", quantity: 300 };
    }
  };

  // Calculate potential purchase quantity
  const calculatePotentialPurchase = () => {
    if (!inputs.localPriceNaira || !inputs.amountRemitted || inputs.localPriceNaira <= 0) return 0;
    return inputs.amountRemitted / inputs.localPriceNaira;
  };

  // Calculate target buy prices for different margins
  const calculateTargetBuyPrices = () => {
    if (!inputs.buyerBidUsd || !inputs.fxRateNairaToUsd || inputs.buyerBidUsd <= 0 || inputs.fxRateNairaToUsd <= 0) {
      return { sixPercent: 0, sevenPercent: 0, eightPercent: 0 };
    }

    const sixPercentPrice = (inputs.buyerBidUsd * (1 - 0.06)) * inputs.fxRateNairaToUsd;
    const sevenPercentPrice = (inputs.buyerBidUsd * (1 - 0.07)) * inputs.fxRateNairaToUsd;
    const eightPercentPrice = (inputs.buyerBidUsd * (1 - 0.08)) * inputs.fxRateNairaToUsd;

    return {
      sixPercent: sixPercentPrice,
      sevenPercent: sevenPercentPrice,
      eightPercent: eightPercentPrice
    };
  };

  // Run calculations
  const runCalculations = () => {
    const { localPriceUsd, relevantCost, grossMarginPercent } = calculateGrossMargin();
    const { signal, quantity } = determineSellSignal(grossMarginPercent);
    const potentialPurchaseQty = calculatePotentialPurchase();
    const targetBuyPrices = calculateTargetBuyPrices();

    setResults({
      localPriceUsd,
      relevantCostForMargin: relevantCost,
      grossMarginPercent,
      sellSignal: signal,
      sellQuantity: quantity,
      potentialPurchaseQty,
      targetBuyPrices
    });
  };

  // Handle CSV file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Read file as text
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const csvText = event.target.result;
        
        // Manually parse CSV
        const lines = csvText.split('\n');
        if (lines.length > 0) {
          let foundValues = false;
          let newInputs = {...inputs};
          
          // Search for values in each line
          lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
              const label = parts[0].toLowerCase().trim();
              const value = parseFloat(parts[1].trim());
              
              if (!isNaN(value)) {
                if (label.includes('local price') || label.includes('naira price')) {
                  newInputs.localPriceNaira = value;
                  foundValues = true;
                } else if (label.includes('stock cost') || label.includes('cnf cost')) {
                  newInputs.existingStockCnfCost = value;
                  foundValues = true;
                } else if (label.includes('buyer') || label.includes('bid')) {
                  newInputs.buyerBidUsd = value;
                  foundValues = true;
                } else if (label.includes('fx rate') || label.includes('exchange')) {
                  newInputs.fxRateNairaToUsd = value;
                  foundValues = true;
                } else if (label.includes('remitted') || label.includes('funds')) {
                  newInputs.amountRemitted = value;
                  foundValues = true;
                } else if (label.includes('quantity') || label.includes('inventory')) {
                  newInputs.existingStockQuantity = value;
                  foundValues = true;
                }
              }
            }
          });
          
          // Update inputs if values were found
          if (foundValues) {
            setInputs(newInputs);
            setTimeout(runCalculations, 100);
          }
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("Error reading CSV file:", error);
    }
  };

  // Save current transaction to history
  const saveToHistory = () => {
    if (results.grossMarginPercent === 0) return;
    
    const newEntry = {
      date: new Date().toLocaleString(),
      inputs: {...inputs},
      results: {...results}
    };
    
    setHistory([newEntry, ...history]);
  };

  // Export data to CSV
  const exportToCSV = () => {
    try {
      // Create CSV content
      let csvContent = "Cashew Trading Decision Tool - Report\n";
      csvContent += "Generated on," + new Date().toLocaleString() + "\n\n";
      
      csvContent += "INPUTS\n";
      csvContent += "Local Price (Naira)," + inputs.localPriceNaira + "\n";
      csvContent += "Existing Stock CnF Cost (USD)," + inputs.existingStockCnfCost + "\n";
      csvContent += "Buyer's Bid (USD)," + inputs.buyerBidUsd + "\n";
      csvContent += "FX Rate (Naira to USD)," + inputs.fxRateNairaToUsd + "\n";
      csvContent += "Amount Remitted (Naira)," + inputs.amountRemitted + "\n";
      csvContent += "Existing Stock Quantity (Tons)," + inputs.existingStockQuantity + "\n\n";
      
      csvContent += "RESULTS\n";
      csvContent += "Local Price (USD)," + results.localPriceUsd.toFixed(2) + "\n";
      csvContent += "Relevant Cost for Margin," + results.relevantCostForMargin.toFixed(2) + "\n";
      csvContent += "Gross Margin (%)," + results.grossMarginPercent.toFixed(2) + "\n";
      csvContent += "Decision," + results.sellSignal + "\n";
      csvContent += "Recommended Sell Quantity (Tons)," + results.sellQuantity + "\n";
      csvContent += "Potential Purchase Quantity (Tons)," + results.potentialPurchaseQty.toFixed(2) + "\n\n";
      
      csvContent += "TARGET BUY PRICES (NAIRA)\n";
      csvContent += "For 6% Margin," + results.targetBuyPrices.sixPercent.toFixed(2) + "\n";
      csvContent += "For 7% Margin," + results.targetBuyPrices.sevenPercent.toFixed(2) + "\n";
      csvContent += "For 8% Margin," + results.targetBuyPrices.eightPercent.toFixed(2) + "\n\n\n";
      
      // Add history if available
      if (history.length > 0) {
        csvContent += "TRANSACTION HISTORY\n";
        csvContent += "Date,Local Price (Naira),Stock Cost (USD),Bid (USD),FX Rate,Gross Margin (%),Decision\n";
        
        history.forEach(entry => {
          csvContent += entry.date + ",";
          csvContent += entry.inputs.localPriceNaira + ",";
          csvContent += entry.inputs.existingStockCnfCost + ",";
          csvContent += entry.inputs.buyerBidUsd + ",";
          csvContent += entry.inputs.fxRateNairaToUsd + ",";
          csvContent += entry.results.grossMarginPercent.toFixed(2) + ",";
          csvContent += entry.results.sellSignal;
          
          if (entry.results.sellQuantity > 0) {
            csvContent += " (" + entry.results.sellQuantity + " tons)";
          }
          
          csvContent += "\n";
        });
      }
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Cashew_Trading_Decision_Report.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-800">Cashew Trading Decision Tool</h1>
        
        {/* CSV Import Section */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Import/Export Data</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Import from CSV</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">Upload a CSV file with your trading data</p>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Export Report (CSV)
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Tabs */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Inputs Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-blue-700">Trading Inputs</h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Today's Local Price (Naira)</label>
                  <input
                    type="number"
                    name="localPriceNaira"
                    value={inputs.localPriceNaira || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Existing Stock CnF Cost (USD)</label>
                  <input
                    type="number"
                    name="existingStockCnfCost"
                    value={inputs.existingStockCnfCost || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Buyer's Bid (USD)</label>
                  <input
                    type="number"
                    name="buyerBidUsd"
                    value={inputs.buyerBidUsd || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">FX Rate (Naira to USD)</label>
                  <input
                    type="number"
                    name="fxRateNairaToUsd"
                    value={inputs.fxRateNairaToUsd || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount Remitted (Naira)</label>
                  <input
                    type="number"
                    name="amountRemitted"
                    value={inputs.amountRemitted || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Existing Stock Quantity (Tons)</label>
                  <input
                    type="number"
                    name="existingStockQuantity"
                    value={inputs.existingStockQuantity || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={runCalculations}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex-1"
                  >
                    Calculate
                  </button>
                  
                  <button
                    onClick={saveToHistory}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex-1"
                  >
                    Save Decision
                  </button>
                </div>
              </div>
            </div>
            
            {/* Results Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-green-700">Trading Decisions</h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white p-3 rounded shadow">
                  <h3 className="font-medium text-gray-700">Price Conversions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Local Price (Naira)</p>
                      <p className="text-lg font-semibold">₦{inputs.localPriceNaira.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Local Price (USD)</p>
                      <p className="text-lg font-semibold">${results.localPriceUsd.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <p className="text-sm">Relevant Cost for Margin: <span className="font-semibold">${results.relevantCostForMargin.toFixed(2)}</span></p>
                    <p className="text-xs text-gray-500 mt-1">
                      {results.relevantCostForMargin === inputs.existingStockCnfCost ? 
                        "Using existing stock cost (higher than current local price)" : 
                        "Using today's local price (higher than existing stock cost)"}
                    </p>
                  </div>
                </div>
                
                <div className={`p-3 rounded shadow ${
                  results.grossMarginPercent >= 6 ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  <h3 className="font-medium text-gray-700">Margin Analysis</h3>
                  
                  <div className="flex items-center mt-2">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-4 border-opacity-50 border-green-500">
                      <span className="text-xl font-bold">{results.grossMarginPercent.toFixed(1)}%</span>
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="h-2.5 rounded-full bg-green-500" 
                          style={{ 
                            width: `${Math.min(100, results.grossMarginPercent * 10)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span>0%</span>
                        <span>6%</span>
                        <span>10%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 rounded bg-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold">Decision:</p>
                        <p className={`text-lg font-bold ${
                          results.sellSignal === 'SELL' ? 'text-green-600' : 'text-yellow-600'
                        }`}>{results.sellSignal}</p>
                      </div>
                      
                      {results.sellQuantity > 0 && (
                        <div className="text-right">
                          <p className="text-sm font-bold">Quantity:</p>
                          <p className="text-lg font-bold text-green-600">{results.sellQuantity} tons</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded shadow">
                  <h3 className="font-medium text-gray-700">Buying Recommendations</h3>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm">Funds Available:</p>
                      <p className="font-semibold">₦{inputs.amountRemitted.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm">Potential Purchase Quantity:</p>
                      <p className="font-semibold">{results.potentialPurchaseQty.toFixed(2)} tons</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">Based on current local price of ₦{inputs.localPriceNaira.toFixed(2)} per ton</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded shadow">
                  <h3 className="font-medium text-gray-700">Target Buy Prices (Naira)</h3>
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center">
                      <div className="w-2 h-10 bg-blue-600 rounded-l mr-2"></div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">For 6% Margin</p>
                        <p className="text-lg font-semibold">₦{results.targetBuyPrices.sixPercent.toFixed(2)}</p>
                      </div>
                      <div className="ml-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          inputs.localPriceNaira <= results.targetBuyPrices.sixPercent ? 
                            'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {inputs.localPriceNaira <= results.targetBuyPrices.sixPercent ? 'FAVORABLE' : 'TOO HIGH'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-2 h-10 bg-blue-500 rounded-l mr-2"></div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">For 7% Margin</p>
                        <p className="text-lg font-semibold">₦{results.targetBuyPrices.sevenPercent.toFixed(2)}</p>
                      </div>
                      <div className="ml-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          inputs.localPriceNaira <= results.targetBuyPrices.sevenPercent ? 
                            'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {inputs.localPriceNaira <= results.targetBuyPrices.sevenPercent ? 'FAVORABLE' : 'TOO HIGH'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-2 h-10 bg-blue-400 rounded-l mr-2"></div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">For 8% Margin</p>
                        <p className="text-lg font-semibold">₦{results.targetBuyPrices.eightPercent.toFixed(2)}</p>
                      </div>
                      <div className="ml-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          inputs.localPriceNaira <= results.targetBuyPrices.eightPercent ? 
                            'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {inputs.localPriceNaira <= results.targetBuyPrices.eightPercent ? 'FAVORABLE' : 'TOO HIGH'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Inventory Management Section */}
        <div className="bg-gray-50 p-4 rounded-lg mt-6">
          <h2 className="text-xl font-semibold mb-4 text-purple-700">Inventory Summary</h2>
          <div className="flex flex-wrap justify-between gap-4">
            <div className="bg-white p-3 rounded shadow flex-1">
              <h3 className="font-medium text-gray-700">Current Inventory</h3>
              <p className="text-sm">Existing Stock: <span className="font-semibold">{inputs.existingStockQuantity} tons</span></p>
              <p className="text-sm">Average Cost: <span className="font-semibold">${inputs.existingStockCnfCost}</span></p>
            </div>
            <div className="bg-white p-3 rounded shadow flex-1">
              <h3 className="font-medium text-gray-700">Total Value</h3>
              <p className="text-sm">Inventory Value: <span className="font-semibold">${(inputs.existingStockQuantity * inputs.existingStockCnfCost).toFixed(2)}</span></p>
              <p className="text-sm">Potential New Purchase Value: <span className="font-semibold">₦{(results.potentialPurchaseQty * inputs.localPriceNaira).toFixed(2)}</span></p>
            </div>
          </div>
        </div>
        
        {/* Transaction History */}
        <div className="bg-gray-50 p-4 rounded-lg mt-6">
          <h2 className="text-xl font-semibold mb-4 text-indigo-700">Transaction History</h2>
          
          {history.length === 0 ? (
            <p className="text-gray-500 italic">No transactions saved yet. Use the "Save Decision" button to record decisions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer Bid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FX Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Decision</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((entry, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">{entry.date}</td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">₦{entry.inputs.localPriceNaira}</td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">${entry.inputs.buyerBidUsd}</td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">{entry.inputs.fxRateNairaToUsd}</td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">{entry.results.grossMarginPercent.toFixed(2)}%</td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.results.sellSignal === 'SELL' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.results.sellSignal} {entry.results.sellQuantity > 0 ? `(${entry.results.sellQuantity} tons)` : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Dashboard Insights */}
        <div className="bg-gray-50 p-4 rounded-lg mt-6">
          <h2 className="text-xl font-semibold mb-4 text-teal-700">Dashboard Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded shadow">
              <h3 className="font-medium text-gray-700 mb-2">Profit Analysis</h3>
              <div className="h-32 flex items-center justify-center">
                <div className="w-32 h-32 relative rounded-full flex items-center justify-center bg-gray-100">
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(${results.grossMarginPercent >= 6 ? '#10B981' : '#F59E0B'} ${Math.min(100, results.grossMarginPercent * 10)}%, #E5E7EB ${Math.min(100, results.grossMarginPercent * 10)}% 100%)`,
                      clipPath: 'circle(50% at 50% 50%)'
                    }}
                  ></div>
                  <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{results.grossMarginPercent.toFixed(1)}%</div>
                      <div className="text-xs text-gray-500">Gross Margin</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded shadow">
              <h3 className="font-medium text-gray-700 mb-2">Transaction Summary</h3>
              <div className="h-32 flex items-center">
                <div className="w-full">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium">Current Transaction</span>
                    <span className="text-xs font-medium">{results.sellQuantity} tons</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" 
                         style={{ width: `${Math.min(100, (results.sellQuantity / 300) * 100)}%` }}></div>
                  </div>
                  
                  <div className="flex justify-between mb-1 mt-4">
                    <span className="text-xs font-medium">Purchase Capacity</span>
                    <span className="text-xs font-medium">{results.potentialPurchaseQty.toFixed(1)} tons</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-purple-600 h-2.5 rounded-full" 
                         style={{ width: `${Math.min(100, (results.potentialPurchaseQty / (inputs.amountRemitted / inputs.localPriceNaira || 1)) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded shadow">
              <h3 className="font-medium text-gray-700 mb-2">Margin Thresholds</h3>
              <div className="h-32 flex flex-col justify-center">
                <div className={`flex items-center mb-2 ${results.grossMarginPercent >= 9 ? 'text-green-700 font-bold' : 'text-gray-500'}`}>
                  <div className={`w-3 h-3 rounded-full mr-2 ${results.grossMarginPercent >= 9 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>9-10% Margin: 300 tons</span>
                </div>
                
                <div className={`flex items-center mb-2 ${results.grossMarginPercent >= 7 && results.grossMarginPercent < 9 ? 'text-green-700 font-bold' : 'text-gray-500'}`}>
                  <div className={`w-3 h-3 rounded-full mr-2 ${results.grossMarginPercent >= 7 && results.grossMarginPercent < 9 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>7-8% Margin: 200 tons</span>
                </div>
                
                <div className={`flex items-center ${results.grossMarginPercent >= 6 && results.grossMarginPercent < 7 ? 'text-green-700 font-bold' : 'text-gray-500'}`}>
                  <div className={`w-3 h-3 rounded-full mr-2 ${results.grossMarginPercent >= 6 && results.grossMarginPercent < 7 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>6% Margin: 100 tons</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Help Section */}
        <div className="bg-blue-50 p-4 rounded-lg mt-6">
          <details>
            <summary className="text-xl font-semibold mb-2 text-blue-700 cursor-pointer">Help & Instructions</summary>
            <div className="mt-2 text-sm text-gray-600">
              <h3 className="font-medium text-gray-800 mb-1">How to Use This Tool</h3>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Import data from CSV by clicking the "Choose File" button or enter data manually in the Trading Inputs section.</li>
                <li>Enter today's local price in Naira, your existing stock CnF cost in USD, and the buyer's bid in USD.</li>
                <li>Input the current FX rate for Naira to USD conversion.</li>
                <li>Enter the amount remitted (in Naira) for potential new purchases.</li>
                <li>Add your existing stock quantity in tons.</li>
                <li>Click "Calculate" to generate trading decisions.</li>
                <li>Review the results in the Trading Decisions section.</li>
                <li>Save important decisions to the history log by clicking "Save Decision".</li>
                <li>Export your data and analysis to CSV using the "Export Report" button.</li>
              </ol>
              
              <h3 className="font-medium text-gray-800 mt-4 mb-1">Decision Rules</h3>
              <ul className="list-disc ml-5 space-y-1">
                <li>A gross margin of less than 6% requires manual override.</li>
                <li>A gross margin of 6-7% triggers a sell signal for 100 tons.</li>
                <li>A gross margin of 7-8% triggers a sell signal for 200 tons.</li>
                <li>A gross margin of 9-10% triggers a sell signal for 300 tons.</li>
              </ul>
              
              <h3 className="font-medium text-gray-800 mt-4 mb-1">Notes</h3>
              <ul className="list-disc ml-5 space-y-1">
                <li>The relevant cost for margin calculation is the higher of the existing stock CnF cost or the current local price converted to USD.</li>
                <li>Target buy prices are calculated based on the buyer's bid and desired margin.</li>
                <li>The potential purchase quantity is based on the amount remitted divided by the local price.</li>
                <li>CSV files should include columns with labels like "Local Price", "Stock Cost", "Buyer Bid", etc.</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default CashewTradingApp;
