const express = require('express');
const https = require('https');
const fetch = require('node-fetch'); // Ensure this is installed

const app = express();
const port = process.env.PORT || 3000;

const hfApiUrl = "https://api-inference.huggingface.co/models/google/gemma-2-2b";
const hfApiKey = "Bearer hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Replace with your Hugging Face API key

app.use(express.json()); // This middleware parses JSON payloads

async function query(data) {
    try {
        const response = await fetch(hfApiUrl, {
            headers: {
                "Authorization": hfApiKey,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Hugging Face API request failed with status ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error querying Hugging Face API:', error);
        throw error;
    }
}

app.post('/get-role', async (req, res) => {
    const { userEmail, message } = req.body;
    console.log(`Received request - userEmail: ${userEmail}, message: ${message}`);

    if (userEmail && message) {
        if (message.toLowerCase().includes('role')) {
            console.log('Fetching role from APEX API');
            try {
                const apexApiUrl = `https://apex.oracle.com/pls/apex/new_api/user_roles/user/${userEmail}`;
                
                https.get(apexApiUrl, (resp) => {
                    let data = '';

                    resp.on('data', (chunk) => {
                        data += chunk;
                    });

                    resp.on('end', async () => {
                        try {
                            const roleData = JSON.parse(data);
                            const role = roleData.items[0]?.r_name; // Extracting the role name

                            if (!role) {
                                throw new Error('Role not found in APEX API response');
                            }

                            const prompt = `User with email ${userEmail} is asking: ${message}. The role is: ${role}`;
                            console.log(`Generated prompt: ${prompt}`);

                            const response = await query({ inputs: prompt });
                            const fullResponse = response.generated_text;

                            console.log(`Received response from Hugging Face API: ${fullResponse}`);
                            res.json({ response: fullResponse });
                        } catch (parseError) {
                            console.error('Error parsing JSON from APEX API:', parseError);
                            res.status(500).json({ error: 'Failed to parse role data' });
                        }
                    });

                }).on("error", (err) => {
                    console.error("Error fetching role from APEX API:", err.message);
                    res.status(500).json({ error: 'Failed to fetch role from APEX API' });
                });

            } catch (error) {
                console.error('Error in processing request:', error.message);
                res.status(500).json({ error: 'Failed to process request' });
            }
        } else {
            const defaultMessage = 'This chatbot only responds to queries about your role.';
            console.log(`Default message: ${defaultMessage}`);
            res.json({ response: defaultMessage });
        }
    } else {
        console.error('Invalid request payload');
        res.status(400).json({ error: 'Invalid request payload' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
