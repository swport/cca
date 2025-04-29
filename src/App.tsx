import React, { useState } from 'react';
import { 
  Box,
  TextField,
  Typography,
  Paper,
  Container,
  Grid,
  Divider,
  Select,
  SelectChangeEvent,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

type CurrencyData = {
  name: string,
  code: string,
  symbol?: string
};

function toAmtLocale(amt: number|string) {
  if(typeof amt === "string") amt = Number(amt.replace(/\D/g, ''));
  return amt.toLocaleString('en-IN', {maximumFractionDigits: 2});
}

function getCurrencyByCode(currencies: CurrencyData[], code: string) {
  return currencies.find(c => c.code == code);
}

function getExchangeFromStorage(code: string) {
  return localStorage.getItem(`cec__exchangeRate_${code}`);
}

function saveSelectedCurrency(curr: CurrencyData) {
  localStorage.setItem("cec__selectedCurrency", JSON.stringify(curr));
}

function getSelectedCurrency() {
  return localStorage.getItem("cec__selectedCurrency");
}

function App() {
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [userCurrency, setUserCurrency] = useState<CurrencyData>();
  
  const [formData, setFormData] = useState({
    officialRate: '',
    boothRate: '',
    amount: '',
    percentageDifference: ''
  });
  const [results, setResults] = useState({
    fcDifference: 0,
    percentageDifference: 0,
    inrDifference: 0,
    finalAmt: 0,
    isWorse: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === "amount" ? toAmtLocale(value) : value
    }));
  };

  const handleUserCurrencyChange = (e: SelectChangeEvent) => {
    const getCurr = getCurrencyByCode(currencies, e.target.value);
    if(getCurr) {
      setUserCurrency(getCurr);
      const er = getExchangeFromStorage(getCurr.code);
      if(er && er.trim() != "") {
        setFormData({
          ...formData,
          officialRate: er
        });
      }
      saveSelectedCurrency(getCurr);
    }
  }

  React.useEffect(() => {
    fetch("currencies.json")
      .then((res) => res.json())
      .then(function(data: CurrencyData[] | undefined | null) {
        if(data) {
          const finalData = Object.values(data);
          if(finalData && finalData.length) {
            setCurrencies(finalData);
          }
        }
      });

    const existingRate = getSelectedCurrency();
    if(existingRate && existingRate.trim() != "") {
      const pd = JSON.parse(existingRate) as CurrencyData;
      if(pd) {
        setUserCurrency(pd);
        const er = getExchangeFromStorage(pd.code);
        if(er && er.trim() != "") {
          setFormData({
            ...formData,
            officialRate: er
          });
        }
      }
    }
  }, [formData]);

  React.useEffect(() => {
    const calculateDifference = () => {
      const officialRate = parseFloat(formData.officialRate) || 0;
      let boothRate = parseFloat(formData.boothRate) || 0;
      const amount = parseFloat(formData.amount.replace(/\D/g, '')) || 0;
    
      if (officialRate > 0 && amount > 0 && (boothRate > 0 || formData.percentageDifference)) {

        const officialAmt = amount * officialRate;

        if(!boothRate && parseFloat(formData.percentageDifference) > 0) {
          boothRate = officialRate * (1 - parseFloat(formData.percentageDifference)/100);
        }

        if(!boothRate) {
          boothRate = officialRate;
        };

        const boothAmt = amount * boothRate;

        const lossInFC = officialAmt - boothAmt; // loss in foreign currency
        const lossInDC = lossInFC * (1/officialRate); // loss in domestic currency
        const percentageDifference = ((boothRate - officialRate) / officialRate) * 100;
    
        setResults({
          finalAmt: boothAmt,
          fcDifference: Math.abs(lossInFC),
          percentageDifference: Math.abs(percentageDifference),
          inrDifference: Math.abs(lossInDC),
          isWorse: boothRate < officialRate
        });
      } else {
        setResults({
          fcDifference: 0,
          percentageDifference: 0,
          inrDifference: 0,
          finalAmt: 0,
          isWorse: false
        });
      }
    };

    calculateDifference();

  }, [formData]);

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography component="div" display="flex" alignItems="center" flexWrap="wrap" gutterBottom sx={{ mb: 3, gap:"8px" }}>
          <div><AttachMoneyIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
          Currency Exchange Calculator</div>
          <FormControl fullWidth sx={{ ml: "auto", maxWidth: "160px"}}>
            <InputLabel id="currency-label">Your Currency</InputLabel>
            <Select
              id="currency"
              labelId="currency-label"
              value={userCurrency?.code}
              label='Your Currency'
              onChange={handleUserCurrencyChange}
            >
              <MenuItem>Select currency</MenuItem>
              {currencies.map(currency => (
                <MenuItem value={currency.code}>{currency.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Typography>

        <Box component="form" noValidate autoComplete="off">
          <Grid container spacing={3}>
            <Grid size={12}>
              <TextField
                fullWidth
                label={`Official Exchange Rate (1 ${userCurrency?.code} to Foreign Currency)`}
                name="officialRate"
                value={formData.officialRate}
                onChange={handleChange}
                type="number"
                placeholder="e.g. 0.012 for 1 INR = 0.012 USD"
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                label={`Booth Exchange Rate (1 ${userCurrency?.code} to Foreign Currency)`}
                name="boothRate"
                value={formData.boothRate}
                onChange={handleChange}
                type="number"
                placeholder="e.g. 0.011 for 1 INR = 0.011 USD"
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                label={`Amount to Exchange (${userCurrency?.code})`}
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                type="text"
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                label="Charge rate in %"
                name="percentageDifference"
                value={formData.percentageDifference}
                onChange={handleChange}
                type="text"
              />
            </Grid>
          </Grid>

          {results.finalAmt > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                <CalculateIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Money you'll get: {toAmtLocale(results.finalAmt)}
              </Typography>

              <Grid container spacing={2}>
                <Grid size={6}>
                  <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                    <Typography variant="subtitle2">Money you're {results.isWorse ? "paying":"saving"}</Typography>
                    <Typography my="8px" variant="h5" color={results.isWorse ? "error" : "success"}>
                      <span>{toAmtLocale(results.fcDifference)}</span>
                    </Typography>
                    <Typography variant="h5" color={results.isWorse ? "error" : "success"}>
                      ({`${userCurrency?.symbol} ${toAmtLocale(results.inrDifference)}`})
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">Percentage Difference</Typography>
                    <Typography variant="h5" color={results.isWorse ? "error" : "success"}>
                      {results.percentageDifference.toFixed(2)}%
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default App;