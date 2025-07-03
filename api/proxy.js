const axios = require("axios");
const https = require("https");
const formidable = require("formidable");
const FormData = require("form-data");
const fs = require("fs");

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    
    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }
    
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    
    try {
        const API_BASE_URL = "https://128.140.37.194:5000";
        
        // Create an HTTPS agent for self-signed certificates
        const agent = new https.Agent({
            rejectUnauthorized: false // Only for self-signed certificates
        });

        // Check if this is a FormData request (for archive-letter)
        const contentType = req.headers["content-type"] || "";
        
        if (contentType.includes("multipart/form-data")) {
            console.log("Processing FormData request for archive-letter");
            
            const form = new formidable.IncomingForm({
                multiples: true,
                keepExtensions: true,
                maxFileSize: 50 * 1024 * 1024, // 50MB
            });

            form.parse(req, async (err, fields, files) => {
                if (err) {
                    console.error("Formidable error:", err);
                    res.status(500).json({
                        error: "Internal server error",
                        message: "Failed to parse form data."
                    });
                    return;
                }

                console.log("Parsed fields:", fields);
                console.log("Parsed files:", Object.keys(files));

                const targetUrl = `${API_BASE_URL}/archive-letter`;
                const formData = new FormData();

                // Append fields - Handle both single values and arrays properly
                for (const key in fields) {
                    if (key !== 'endpoint') { // Skip the endpoint field we added
                        const value = fields[key];
                        
                        // Check if value is an array
                        if (Array.isArray(value)) {
                            // If it's an array, append each value separately or take the first one
                            if (value.length > 0) {
                                // For most cases, we want the first value
                                formData.append(key, value[0]);
                                console.log(`Added field (from array): ${key} = ${value[0]}`);
                            }
                        } else {
                            // If it's a single value, append it directly
                            formData.append(key, value);
                            console.log(`Added field: ${key} = ${value}`);
                        }
                    }
                }

                // Append files
                for (const key in files) {
                    const file = files[key];
                    
                    // Handle both single files and arrays of files
                    if (Array.isArray(file)) {
                        // If it's an array of files, append each one
                        file.forEach((f, index) => {
                            if (f && f.filepath) {
                                const fileKey = file.length > 1 ? `${key}_${index}` : key;
                                formData.append(fileKey, fs.createReadStream(f.filepath), {
                                    filename: f.originalFilename || 'file',
                                    contentType: f.mimetype || 'application/octet-stream'
                                });
                                console.log(`Added file (from array): ${fileKey} = ${f.originalFilename}`);
                            }
                        });
                    } else {
                        // Single file
                        if (file && file.filepath) {
                            formData.append(key, fs.createReadStream(file.filepath), {
                                filename: file.originalFilename || 'file',
                                contentType: file.mimetype || 'application/octet-stream'
                            });
                            console.log(`Added file: ${key} = ${file.originalFilename}`);
                        }
                    }
                }

                try {
                    console.log("Sending request to:", targetUrl);
                    const response = await axios.post(targetUrl, formData, {
                        headers: {
                            ...formData.getHeaders(),
                        },
                        httpsAgent: agent,
                        timeout: 30000, // 30 seconds timeout
                    });
                    
                    console.log("Archive API success:", response.status);
                    res.status(200).json(response.data);
                    
                } catch (axiosError) {
                    console.error("Archive API error:", axiosError.message);
                    if (axiosError.response) {
                        console.error("Archive API response data:", axiosError.response.data);
                        console.error("Archive API response status:", axiosError.response.status);
                        res.status(axiosError.response.status).json({
                            error: "Archive API error",
                            message: axiosError.response.data || axiosError.message
                        });
                    } else {
                        res.status(500).json({
                            error: "Internal server error",
                            message: "Failed to archive letter. Please try again later."
                        });
                    }
                }
            });
            
        } else {
            // Handle JSON requests (for generate-letter and archive-letter)
            console.log("Processing JSON request");
            
            let requestData;
            try {
                requestData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                res.status(400).json({ error: "Invalid JSON in request body" });
                return;
            }
            
            const { endpoint, data } = requestData;
            
            if (endpoint === "generate-letter") {
                const targetUrl = `${API_BASE_URL}/generate-letter`;
                
                try {
                    console.log("Attempting generate API call to:", targetUrl);
                    console.log("Payload:", data);
                    
                    const response = await axios.post(targetUrl, data, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        httpsAgent: agent,
                        timeout: 30000, // 30 seconds timeout
                    });
                    
                    console.log("Generate API success:", response.status);
                    res.status(200).json(response.data);
                    
                } catch (axiosError) {
                    console.error("Generate API error:", axiosError.message);
                    if (axiosError.response) {
                        console.error("Generate API response data:", axiosError.response.data);
                        console.error("Generate API response status:", axiosError.response.status);
                        res.status(axiosError.response.status).json({
                            error: "Generate API error",
                            message: axiosError.response.data || axiosError.message
                        });
                    } else {
                        res.status(500).json({
                            error: "Internal server error",
                            message: "Failed to generate letter. Please try again later."
                        });
                    }
                }
            } else if (endpoint === "archive-letter") {
                const targetUrl = `${API_BASE_URL}/archive-letter`;
                
                try {
                    console.log("Attempting archive API call to:", targetUrl);
                    console.log("Payload:", data);
                    
                    const response = await axios.post(targetUrl, data, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        httpsAgent: agent,
                        timeout: 30000, // 30 seconds timeout
                    });
                    
                    console.log("Archive API success:", response.status);
                    res.status(200).json(response.data);
                    
                } catch (axiosError) {
                    console.error("Archive API error:", axiosError.message);
                    if (axiosError.response) {
                        console.error("Archive API response data:", axiosError.response.data);
                        console.error("Archive API response status:", axiosError.response.status);
                        res.status(axiosError.response.status).json({
                            error: "Archive API error",
                            message: axiosError.response.data || axiosError.message
                        });
                    } else {
                        res.status(500).json({
                            error: "Internal server error",
                            message: "Failed to archive letter. Please try again later."
                        });
                    }
                }
            } else {
                console.log("Invalid endpoint:", endpoint);
                res.status(400).json({ error: "Invalid endpoint" });
            }
        }
        
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ 
            error: "Internal server error",
            message: error.message 
        });
    }
};
