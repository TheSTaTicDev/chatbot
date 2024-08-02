const express = require('express');
const https = require('https');
const { HfInference } = require('@huggingface/inference');

const app = express();
const port = process.env.PORT || 3000;

const hfInference = new HfInference("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");

app.use(express.json());

app.post('/get-role', async (req, res) => {
    const { userEmail, message } = req.body;
    console.log(`Received request - userEmail: ${userEmail}, message: ${message}`);

    if (message.toLowerCase().includes('role')) {
        console.log('Fetching role from APEX API');
        try {
            const apexApiUrl = `https://apex.oracle.com/pls/apex/new_api/user_roles/user/${userEmail}`;
            
            https.get(apexApiUrl, (resp) => {
                let data = '';

                // A chunk of data has been received.
                resp.on('data', (chunk) => {
                    console.log('Received data chunk:', chunk.toString());
                    data += chunk;
                });

                // The whole response has been received.
                resp.on('end', async () => {
                    console.log('Response from APEX API:', data);

                    try {
                        const roleData = JSON.parse(data);
                        const role = roleData.items[0]?.r_name; // Extracting the role name
                        console.log(`Role for user ${userEmail}: ${role}`);

                        const prompt = `Provide a friendly message to the User with email ${userEmail} is asking:${message}. The role is: ${role}. Do not greet with name just inform them about their role in the app.`;
                        console.log('Prompt for AI:', prompt);

                        let aiResponse = '';

                        for await (const chunk of hfInference.chatCompletionStream({
                            model: "mistralai/Mistral-Nemo-Instruct-2407",
                            messages: [{ role: "user", content: prompt }],
                            max_tokens: 500,
                        })) {
                            aiResponse += chunk.choices[0]?.delta?.content || "";
                        }

                        console.log('Response from AI:', aiResponse);
                        res.json({ response: aiResponse });
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
