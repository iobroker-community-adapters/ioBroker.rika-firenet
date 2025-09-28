# ioBroker Adapter Development with GitHub Copilot

**Version:** 0.4.0
**Template Source:** https://github.com/DrozmotiX/ioBroker-Copilot-Instructions

This file contains instructions and best practices for GitHub Copilot when working on ioBroker adapter development.

## Project Context

You are working on an ioBroker adapter. ioBroker is an integration platform for the Internet of Things, focused on building smart home and industrial IoT solutions. Adapters are plugins that connect ioBroker to external systems, devices, or services.

This adapter connects ioBroker to RIKA pellet stoves through the RIKA-Firenet cloud service. It enables monitoring and control of RIKA stoves remotely, including:
- Reading sensor data (temperatures, pellet levels, operating status)
- Controlling stove operations (on/off, heating power, target temperature)
- Managing stove features and settings
- Monitoring connection status and error conditions

Key integration points:
- **RIKA-Firenet API**: Cloud-based REST API requiring authentication
- **Cookie-based sessions**: Using tough-cookie and axios-cookiejar-support
- **Polling architecture**: Regular data fetching with configurable intervals (minimum 1 minute)
- **State management**: Dynamic creation and updating of ioBroker states based on stove capabilities

## Adapter-Specific Context
- **Adapter Name**: rika-firenet
- **Primary Function**: Control and monitor RIKA pellet stoves via RIKA-Firenet cloud service
- **Key Dependencies**: axios (HTTP client), tough-cookie (cookie management), axios-cookiejar-support (cookie integration)
- **Configuration Requirements**: Username/email, password (encrypted), stove ID, polling interval
- **API Characteristics**: Session-based authentication, JSON payloads, rate limiting considerations

## Testing

### Unit Testing
- Use Jest as the primary testing framework for ioBroker adapters
- Create tests for all adapter main functions and helper methods
- Test error handling scenarios and edge cases
- Mock external API calls and hardware dependencies
- For adapters connecting to APIs/devices not reachable by internet, provide example data files to allow testing of functionality without live connections
- Example test structure:
  ```javascript
  describe('AdapterName', () => {
    let adapter;
    
    beforeEach(() => {
      // Setup test adapter instance
    });
    
    test('should initialize correctly', () => {
      // Test adapter initialization
    });
  });
  ```

### Integration Testing

**IMPORTANT**: Use the official `@iobroker/testing` framework for all integration tests. This is the ONLY correct way to test ioBroker adapters.

**Official Documentation**: https://github.com/ioBroker/testing

#### Framework Structure
Integration tests MUST follow this exact pattern:

```javascript
const path = require('path');
const { tests } = require('@iobroker/testing');

// Define test coordinates or configuration
const TEST_COORDINATES = '52.520008,13.404954'; // Berlin
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Use tests.integration() with defineAdditionalTests
tests.integration(path.join(__dirname, '..'), {
    defineAdditionalTests({ suite }) {
        suite('Test adapter with specific configuration', (getHarness) => {
            let harness;

            before(() => {
                harness = getHarness();
            });

            it('should configure and start adapter', function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        harness = getHarness();
                        
                        // Get adapter object using promisified pattern
                        const obj = await new Promise((res, rej) => {
                            harness.objects.getObject('system.adapter.your-adapter.0', (err, o) => {
                                if (err) return rej(err);
                                res(o);
                            });
                        });
                        
                        if (!obj) {
                            return reject(new Error('Adapter object not found'));
                        }

                        // Configure adapter properties
                        Object.assign(obj.native, {
                            position: TEST_COORDINATES,
                            createCurrently: true,
                            createHourly: true,
                            createDaily: true,
                            // Add other configuration as needed
                        });

                        // Set the updated configuration
                        harness.objects.setObject(obj._id, obj);

                        console.log('✅ Step 1: Configuration written, starting adapter...');
                        
                        // Start adapter and wait
                        await harness.startAdapterAndWait();
                        
                        console.log('✅ Step 2: Adapter started');

                        // Wait for adapter to process data
                        const waitMs = 15000;
                        await wait(waitMs);

                        console.log('🔍 Step 3: Checking states after adapter run...');
                        
                        // Check for created states
                        const states = await harness.states.getStatesAsync('your-adapter.0.*');
                        console.log(`📊 Found ${Object.keys(states).length} states`);
                        
                        if (Object.keys(states).length === 0) {
                            return reject(new Error('No states were created by adapter'));
                        }
                        
                        resolve();
                    } catch (error) {
                        console.error('❌ Test failed:', error);
                        reject(error);
                    }
                });
            }).timeout(30000); // Generous timeout for integration tests
        });
    }
});
```

#### Real-World Examples
For production adapters with external dependencies, use this proven pattern:

```javascript
// tests/integration.js - Standard integration tests (no credentials required)
const path = require('path');
const { tests } = require('@iobroker/testing');

// Run integration tests - automatically validates adapter structure, package files, etc.
tests.integration(path.join(__dirname, '..'));
```

#### Advanced Testing with Mock Data
For testing with representative data without API credentials:

```javascript
// tests/integration-with-mock-data.js
const path = require('path');
const { tests } = require('@iobroker/testing');

tests.integration(path.join(__dirname, '..'), {
    defineAdditionalTests({ suite }) {
        suite('Mock data processing tests', (getHarness) => {
            it('should process mock RIKA stove data correctly', async function() {
                this.timeout(60000);
                
                const harness = getHarness();
                
                // Configure adapter with mock data file
                await harness.changeAdapterConfig('rika-firenet', {
                    native: {
                        mockDataFile: path.join(__dirname, 'mock-data', 'rika-stove-response.json'),
                        useMockData: true
                    }
                });
                
                await harness.startAdapterAndWait();
                
                // Wait for mock data processing
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Verify states were created from mock data
                const states = await harness.states.getStatesAsync('rika-firenet.0.*');
                
                console.log(`Created ${Object.keys(states).length} states from mock data`);
                
                // Verify expected states exist
                const connectionState = states['rika-firenet.0.info.connection'];
                const controlsState = states['rika-firenet.0.controls.onOff'];
                
                if (!connectionState || !controlsState) {
                    throw new Error('Expected states not created from mock data');
                }
            });
        });
    }
});
```

## Core ioBroker Adapter Patterns

### State Management
```javascript
// Creating states - always check if already exists to avoid errors
async setStoveStates(name, type, role, read, write, value) {
    const stateId = `${this.namespace}.${name}`;
    
    // Check if state already exists
    const existingState = await this.getObjectAsync(stateId);
    if (!existingState) {
        await this.setObjectNotExistsAsync(stateId, {
            type: type,
            common: {
                name: name,
                type: typeof value,
                role: role || 'state',
                read: read,
                write: write,
            },
            native: {},
        });
    }
    
    // Set the value
    await this.setStateAsync(stateId, { val: value, ack: true });
}

// Handling state changes
onStateChange(id, state) {
    if (state && !state.ack) {
        // User changed a writable state - handle the change
        const cleanId = id.replace(this.namespace + '.', '');
        this.log.debug(`State ${id} changed to ${state.val} (user command)`);
        
        // Process the state change based on your adapter logic
        if (cleanId.startsWith('controls.')) {
            this.setstoveValues(cleanId, state.val);
        }
    }
}
```

### Connection Management
```javascript
// Connection state management
async setConnectionState(connected, message = '') {
    await this.setStateAsync('info.connection', { val: connected, ack: true });
    
    if (connected) {
        this.log.info('Connected to RIKA-Firenet');
    } else {
        this.log.warn(`Disconnected from RIKA-Firenet: ${message}`);
    }
}
```

### Error Handling
```javascript
// Robust error handling with proper logging levels
async performApiCall() {
    try {
        const response = await this.apiClient.get('/endpoint');
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            this.log.error('Authentication failed - check credentials');
            await this.setConnectionState(false, 'Authentication failed');
        } else if (error.code === 'ENOTFOUND') {
            this.log.error('Network error - DNS resolution failed');
            await this.setConnectionState(false, 'Network error');
        } else {
            this.log.error(`API call failed: ${error.message}`);
            await this.setConnectionState(false, `API error: ${error.message}`);
        }
        throw error;
    }
}
```

### Adapter Lifecycle
```javascript
async onReady() {
    // Initialize your adapter
    this.log.info('Adapter starting up');
    
    // Subscribe to state changes
    this.subscribeStates('controls.*');
    
    // Start main functionality
    await this.initializeConnection();
    
    // Set up polling
    this.startPolling();
}

async onUnload(callback) {
    try {
        // Clear timers
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = undefined;
        }
        
        // Clear timeouts
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = undefined;
        }
        
        // Close connections, clean up resources
        callback();
    } catch (e) {
        callback();
    }
}
```

## Code Style and Standards

- Follow JavaScript/TypeScript best practices
- Use async/await for asynchronous operations
- Implement proper resource cleanup in `unload()` method
- Use semantic versioning for adapter releases
- Include proper JSDoc comments for public methods

## CI/CD and Testing Integration

### GitHub Actions for API Testing
For adapters with external API dependencies, implement separate CI/CD jobs:

```yaml
# Tests API connectivity with demo credentials (runs separately)
demo-api-tests:
  if: contains(github.event.head_commit.message, '[skip ci]') == false
  
  runs-on: ubuntu-22.04
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run demo API tests
      run: npm run test:integration-demo
```

### CI/CD Best Practices
- Run credential tests separately from main test suite
- Use ubuntu-22.04 for consistency
- Don't make credential tests required for deployment
- Provide clear failure messages for API connectivity issues
- Use appropriate timeouts for external API calls (120+ seconds)

### Package.json Script Integration
Add dedicated script for credential testing:
```json
{
  "scripts": {
    "test:integration-demo": "mocha test/integration-demo --exit"
  }
}
```

### Practical Example: Complete API Testing Implementation
Here's a complete example based on lessons learned from the Discovergy adapter:

#### test/integration-demo.js
```javascript
const path = require("path");
const { tests } = require("@iobroker/testing");

// Helper function to encrypt password using ioBroker's encryption method
async function encryptPassword(harness, password) {
    const systemConfig = await harness.objects.getObjectAsync("system.config");
    
    if (!systemConfig || !systemConfig.native || !systemConfig.native.secret) {
        throw new Error("Could not retrieve system secret for password encryption");
    }
    
    const secret = systemConfig.native.secret;
    let result = '';
    for (let i = 0; i < password.length; ++i) {
        result += String.fromCharCode(secret[i % secret.length].charCodeAt(0) ^ password.charCodeAt(i));
    }
    
    return result;
}

// Run integration tests with demo credentials
tests.integration(path.join(__dirname, ".."), {
    defineAdditionalTests({ suite }) {
        suite("API Testing with Demo Credentials", (getHarness) => {
            let harness;
            
            before(() => {
                harness = getHarness();
            });

            it("Should connect to API and initialize with demo credentials", async () => {
                console.log("Setting up demo credentials...");
                
                if (harness.isAdapterRunning()) {
                    await harness.stopAdapter();
                }
                
                const encryptedPassword = await encryptPassword(harness, "demo_password");
                
                await harness.changeAdapterConfig("your-adapter", {
                    native: {
                        username: "demo@provider.com",
                        password: encryptedPassword,
                        // other config options
                    }
                });

                console.log("Starting adapter with demo credentials...");
                await harness.startAdapter();
                
                // Wait for API calls and initialization
                await new Promise(resolve => setTimeout(resolve, 60000));
                
                const connectionState = await harness.states.getStateAsync("your-adapter.0.info.connection");
                
                if (connectionState && connectionState.val === true) {
                    console.log("✅ SUCCESS: API connection established");
                    return true;
                } else {
                    throw new Error("API Test Failed: Expected API connection to be established with demo credentials. " +
                        "Check logs above for specific API errors (DNS resolution, 401 Unauthorized, network issues, etc.)");
                }
            }).timeout(120000);
        });
    }
});
```

### RIKA-Firenet Specific Testing Considerations

When testing the RIKA-Firenet adapter, consider these specific scenarios:

#### Mock Data Structure for RIKA API Response
```javascript
// test/mock-data/rika-stove-response.json
{
  "lastSeenMinutes": 2,
  "stoveType": "PARO",
  "oem": "RIKA",
  "lastConfirmedRevision": 1648,
  "controls": {
    "onOff": false,
    "heatingPower": 80,
    "targetTemperature": 21,
    "operatingMode": 1,
    "heatingTimes": {
      "timeSlot1": {
        "start": "06:00",
        "end": "22:00"
      }
    }
  },
  "sensors": {
    "inputRoomTemperature": 20.5,
    "inputFlameTemperature": 45,
    "inputBakeTemperature": 89,
    "statusError": 0,
    "statusSubError": 0,
    "statusMainState": 1,
    "statusSubState": 0,
    "statusFrostStarted": false,
    "statusFrostTemperature": 7,
    "parameterFeedRateTotal": 204570,
    "parameterRuntimeLogs": 720,
    "parameterIgnitionCount": 123
  },
  "stoveFeatures": {
    "multiAir1": false,
    "multiAir2": false,
    "insertionMotor": true,
    "airFlaps": false,
    "logBook": true
  }
}
```

#### Testing Cookie Management
```javascript
// Test cookie persistence and session management
it('should maintain session cookies across API calls', async function() {
    this.timeout(30000);
    
    const harness = getHarness();
    
    await harness.changeAdapterConfig('rika-firenet', {
        native: {
            myuser: 'test@example.com',
            mypassword: await encryptPassword(harness, 'testpass'),
            mystoveid: 'TEST123',
            myinterval: 1
        }
    });
    
    await harness.startAdapterAndWait();
    
    // Allow time for authentication and cookie setup
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check that adapter maintains connection state
    const connectionState = await harness.states.getStateAsync('rika-firenet.0.info.connection');
    
    if (connectionState && connectionState.val === true) {
        console.log('✅ Cookie-based authentication successful');
    } else {
        throw new Error('Authentication failed - check cookie management');
    }
});
```

#### Testing Rate Limiting Compliance
```javascript
// Test polling interval compliance (minimum 1 minute)
it('should respect minimum polling interval of 1 minute', async function() {
    this.timeout(150000); // 2.5 minutes
    
    const harness = getHarness();
    
    // Configure with minimum interval
    await harness.changeAdapterConfig('rika-firenet', {
        native: {
            myinterval: 1  // 1 minute minimum
        }
    });
    
    await harness.startAdapterAndWait();
    
    // Record initial poll time
    const startTime = Date.now();
    
    // Wait for at least 2 polling cycles
    await new Promise(resolve => setTimeout(resolve, 130000)); // 2+ minutes
    
    const endTime = Date.now();
    const elapsedMinutes = (endTime - startTime) / 60000;
    
    console.log(`Elapsed time: ${elapsedMinutes.toFixed(2)} minutes`);
    
    // Verify that polling respected the minimum interval
    if (elapsedMinutes < 2) {
        throw new Error('Polling interval too aggressive - must respect 1-minute minimum');
    }
});
```

### RIKA-Specific Authentication Patterns
When working with RIKA-Firenet authentication, follow these patterns:

```javascript
// Proper error handling for RIKA authentication
async authenticate() {
    try {
        const loginUrl = `${baseUrl}/web/login`;
        const response = await this.client.post(loginUrl, {
            email: this.config.myuser,
            password: this.config.mypassword
        });
        
        if (response.status === 200) {
            this.log.debug('Authentication successful');
            await this.setConnectionState(true);
            return true;
        }
    } catch (error) {
        if (error.response?.status === 401) {
            this.log.error('Invalid credentials for RIKA-Firenet');
        } else if (error.response?.status === 429) {
            this.log.warn('Rate limited by RIKA-Firenet - backing off');
        } else {
            this.log.error(`Authentication failed: ${error.message}`);
        }
        await this.setConnectionState(false, error.message);
        return false;
    }
}
```