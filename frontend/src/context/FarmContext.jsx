import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getFarms } from '../api';

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFarms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFarms();
      setFarms(data);
      if (data.length > 0) {
        setSelectedFarmId(prev => {
          if (prev && data.some(f => f.id === prev)) return prev;
          const demo = data.find(f => f.is_demo === 1) || data[0];
          return demo.id;
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFarms();
  }, []);

  const selectedFarm = farms.find(f => f.id === selectedFarmId) || null;

  return (
    <FarmContext.Provider value={{
      farms, setFarms,
      selectedFarmId, setSelectedFarmId,
      selectedFarm,
      loading, error,
      reloadFarms: loadFarms,
    }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarm must be used within FarmProvider');
  return ctx;
}
