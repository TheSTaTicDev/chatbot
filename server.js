const express = require('express');
const https = require('https');
const { HfInference } = require('@huggingface/inference');

const app = express();
const port = process.env.PORT || 3000;

const hf = new HfInference("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");

app.use(express.json()); // Middleware to parse JSON payloads

app.post('/get-role', async (req, res) => {
    const { userEmail, message } = req.body;
    console.log(`Received request - userEmail: ${userEmail}, message: ${message}`);

    if (!userEmail || !message) {
        console.error('Invalid request payload: Missing userEmail or message');
        return res.status(400).json({ error: 'Invalid request payload' });
    }

    if (message.toLowerCase().includes('role')) {
        console.log('Fetching role from APEX API');
        try {
            const apexApiUrl = `https://apex.oracle.com/pls/apex/new_api/user_roles/user/${userEmail}`;
            console.log(`APEX API URL: ${apexApiUrl}`);
            
            https.get(apexApiUrl, (resp) => {
                let data = '';
                
                resp.on('data', (chunk) => {
                    console.log('Received data chunk from APEX API:', chunk.toString());
                    data += chunk;
                });

                resp.on('end', async () => {
                    console.log('Completed receiving data from APEX API');
                    try {
                        const roleData = JSON.parse(data);

                        const role = roleData.items[0]?.r_name; // Extracting the role name
                        if (!role) {
                            console.error('Role data not found for the user:', userEmail);
                            return res.status(404).json({ error: 'Role not found' });
                        }

                        const prompt = `The role of the user with email ${userEmail} is: ${role}`;
                        res.json({ response: prompt });
                        
                        // Using textGeneration as an alternative
                        // try {
                        //     const response = await hf.summarization({
                        //               model: 'facebook/bart-large-cnn',
                        //               inputs: prompt,
                        //               parameters: {
                        //               max_length: 100
                        //               }
                        //     })

                        //     const fullResponse = response.generated_text;
                        //     console.log('Response from AI:', fullResponse);
                        //     res.json({ response: fullResponse });
                        // } catch (aiError) {
                        //     console.error('Error calling Hugging Face AI model:', aiError);
                        //     res.status(500).json({ error: 'Failed to get response from AI model' });
                        // }
                        
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
        console.log('Non-role query received:', message);
        res.json({ response: defaultMessage });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
