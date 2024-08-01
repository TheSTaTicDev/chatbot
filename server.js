const express = require('express');
const https = require('https');
const { HfInference } = require('@huggingface/inference');

const app = express();
const port = process.env.PORT || 3000;

const hfInference = new HfInference("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");

app.use(express.json());

app.post('/get-role', async (req, res) => {
    const { userEmail, message } = req.body;

    if (message.toLowerCase().includes('role')) {
        console.log('Fetching role from APEX API');
        try {
            const apexApiUrl = `https://apex.oracle.com/pls/apex/new_api/user_roles/user/${userEmail}`;
            
            https.get(apexApiUrl, (resp) => {
                let data = '';

                // A chunk of data has been received.
                resp.on('data', (chunk) => {
                    data += chunk;
                });

                // The whole response has been received.
                resp.on('end', async () => {
                    const roleData = JSON.parse(data);
                    const role = roleData.role;

                    const prompt = `User with email ${userEmail} is asking: ${message}. The role is: ${role}`;

                    let fullResponse = '';

                    for await (const chunk of hfInference.chatCompletionStream({
                        model: "microsoft/DialoGPT-medium",
                        messages: [{ role: "user", content: prompt }],
                        max_tokens: 500,
                    })) {
                        fullResponse += chunk.choices[0]?.delta?.content || "";
                    }

                    res.json({ response: fullResponse });
                });

            }).on("error", (err) => {
                console.error("Error: " + err.message);
                res.status(500).json({ error: 'Failed to fetch role or generate response' });
            });

        } catch (error) {
            console.error('Error fetching role or generating response:', error.message);
            res.status(500).json({ error: 'Failed to fetch role or generate response' });
        }
    } else {
        res.json({ response: 'This chatbot only responds to queries about your role.' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
