const express = require('express');
const https = require('https');
const { HfInference } = require('@huggingface/inference');

const app = express();
const port = process.env.PORT || 3000;

const hfInference = new HfInference("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");

app.use(express.json()); // This middleware parses JSON payloads

app.post('/get-role', async (req, res) => {
    console.log(`REQ: `,req);
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

                            const prompt = `User with email ${userEmail} is asking: ${message}. The role is: ${role}`;

                            const response = await hfInference.chatCompletionStream({
                                model: "mistralai/Mistral-Nemo-Instruct-2407",
                                messages: [{ role: "user", content: prompt }],
                                max_tokens: 500
                            });

                            let fullResponse = '';
                            for await (const chunk of response) {
                                fullResponse += chunk.choices[0]?.delta?.content || "";
                            }

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
            res.json({ response: defaultMessage });
        }
    } else {
        res.status(400).json({ error: 'Invalid request payload' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
