const express = require('express');
const https = require('https');
const { AutoTokenizer, AutoModelForCausalLM } = require('@huggingface/transformers');

const app = express();
const port = process.env.PORT || 3000;

const tokenizer = AutoTokenizer.from_pretrained("google/gemma-2b");
const model = AutoModelForCausalLM.from_pretrained("google/gemma-2-2b");

app.use(express.json()); // This middleware parses JSON payloads

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

                            const prompt = `User with email ${userEmail} is asking: ${message}. The role is: ${role}`;
                            const inputs = tokenizer(prompt, { return_tensors: "pt" });

                            const output = await model.generate(inputs.input_ids, { max_new_tokens: 100 });
                            const fullResponse = tokenizer.decode(output[0]);

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
