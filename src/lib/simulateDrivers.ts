import { supabase } from './supabase';

// Simulated driver data near Kwame Nkrumah Circle, Accra
const simulatedDrivers = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    driver_id: '00000000-0000-0000-0000-000000000001',
    latitude: 5.6037,
    longitude: -0.1870,
    is_active: true,
    last_updated: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    driver_id: '00000000-0000-0000-0000-000000000002',
    latitude: 5.6050,
    longitude: -0.1850,
    is_active: true,
    last_updated: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    driver_id: '00000000-0000-0000-0000-000000000003',
    latitude: 5.6020,
    longitude: -0.1890,
    is_active: true,
    last_updated: new Date().toISOString()
  }
];

let simulationInterval: NodeJS.Timeout | null = null;

/**
 * Insert initial simulated drivers into the database
 */
export const initializeSimulatedDrivers = async () => {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return;
  }

  try {
    // Clear existing simulated drivers
    await supabase
      .from('driver_locations')
      .delete()
      .in('driver_id', simulatedDrivers.map(d => d.driver_id));

    // Insert simulated drivers
    const { error } = await supabase
      .from('driver_locations')
      .insert(simulatedDrivers);

    if (error) {
      console.error('Error inserting simulated drivers:', error);
    } else {
      console.log('Simulated drivers initialized successfully');
    }
  } catch (err) {
    console.error('Failed to initialize simulated drivers:', err);
  }
};

/**
 * Start the simulation - updates driver coordinates every 3 seconds
 */
export const startDriverSimulation = () => {
  if (simulationInterval) {
    console.log('Simulation already running');
    return;
  }

  console.log('Starting driver simulation...');

  simulationInterval = setInterval(async () => {
    if (!supabase) return;

    try {
      // Update each driver's location with small random movements
      for (const driver of simulatedDrivers) {
        // Random movement within ~100 meters
        const latChange = (Math.random() - 0.5) * 0.001;
        const lngChange = (Math.random() - 0.5) * 0.001;

        driver.latitude += latChange;
        driver.longitude += lngChange;
        driver.last_updated = new Date().toISOString();

        await supabase
          .from('driver_locations')
          .update({
            latitude: driver.latitude,
            longitude: driver.longitude,
            last_updated: driver.last_updated
          })
          .eq('id', driver.id);
      }

      console.log('Updated simulated driver locations');
    } catch (err) {
      console.error('Error updating simulated drivers:', err);
    }
  }, 3000);
};

/**
 * Stop the simulation
 */
export const stopDriverSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    console.log('Driver simulation stopped');
  }
};

/**
 * Clear all simulated drivers from the database
 */
export const clearSimulatedDrivers = async () => {
  if (!supabase) return;

  try {
    await supabase
      .from('driver_locations')
      .delete()
      .in('driver_id', simulatedDrivers.map(d => d.driver_id));

    console.log('Simulated drivers cleared');
  } catch (err) {
    console.error('Failed to clear simulated drivers:', err);
  }
};
