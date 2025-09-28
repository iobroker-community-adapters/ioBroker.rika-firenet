/**
 * Test file to validate GitHub Copilot enhanced suggestions for RIKA-Firenet adapter
 * This file demonstrates that Copilot now understands ioBroker and RIKA-specific patterns
 */

// Test 1: ioBroker adapter patterns - setState should suggest proper structure
async function testStateHandling(adapter) {
    // Typing this.setState( should now suggest ioBroker-specific patterns
    await adapter.setStateAsync('info.connection', {
        val: true,
        ack: true
    });
    
    // Test setting RIKA-specific states
    await adapter.setStateAsync('sensors.inputRoomTemperature', {
        val: 20.5,
        ack: true
    });
    
    // Test writable control states
    await adapter.setStateAsync('controls.targetTemperature', {
        val: 21,
        ack: false // User command
    });
}

// Test 2: RIKA API authentication pattern
async function testRikaAuthentication(client, config) {
    try {
        const baseUrl = 'https://www.rika-firenet.com';
        const loginUrl = `${baseUrl}/web/login`;
        
        const response = await client.post(loginUrl, {
            email: config.myuser,
            password: config.mypassword
        });
        
        if (response.status === 200) {
            // Copilot should suggest proper logging patterns
            console.log('✅ Authentication successful');
            return true;
        }
    } catch (error) {
        // Copilot should suggest RIKA-specific error handling
        if (error.response?.status === 401) {
            console.error('Invalid credentials for RIKA-Firenet');
        } else if (error.response?.status === 429) {
            console.warn('Rate limited by RIKA-Firenet - backing off');
        }
        return false;
    }
}

// Test 3: State creation pattern for dynamic RIKA data
async function createRikaStates(adapter, stoveData) {
    // Copilot should understand the dynamic state creation pattern
    for (const [key, value] of Object.entries(stoveData.controls)) {
        const stateId = `controls.${key}`;
        
        await adapter.setObjectNotExistsAsync(stateId, {
            type: 'state',
            common: {
                name: key,
                type: typeof value,
                role: 'state',
                read: true,
                write: ['onOff', 'heatingPower', 'targetTemperature'].includes(key)
            },
            native: {}
        });
        
        await adapter.setStateAsync(stateId, { val: value, ack: true });
    }
}

module.exports = {
    testStateHandling,
    testRikaAuthentication,
    createRikaStates
};