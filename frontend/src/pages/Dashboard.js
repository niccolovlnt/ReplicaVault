import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Alert, ListGroup, Spinner } from 'react-bootstrap';
import axios from 'axios';

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch files from API
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/files`);
      setFiles(response.data.files);
      setError('');
    } catch (err) {
      setError('Failed to load files. Please try again.');
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Handle file upload
  const handleFileUpload = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    setUploading(true);
    setError('');
    setSuccess('');
    
    const formData = new FormData();
    formData.append('file', selectedFiles[0]);
    
    try {
      await axios.post(`/api/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess('File uploaded successfully!');
      fetchFiles();
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  // Handle file download
  const handleDownload = async (filename) => {
    try {
      window.open(`/api/files/${filename}`);
    } catch (err) {
      setError('Failed to download file. Please try again.');
      console.error('Error downloading file:', err);
    }
  };

  // Handle file deletion
  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }
    
    try {
      await axios.delete(`/api/files/${filename}`);
      setSuccess('File deleted successfully!');
      fetchFiles();
    } catch (err) {
      setError('Failed to delete file. Please try again.');
      console.error('Error deleting file:', err);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container>
      <h1 className="mb-4">My Files</h1>
      
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
      
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <div 
                className={`drag-area ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="d-none"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  disabled={uploading}
                />
                <label htmlFor="file-upload" className="mb-0">
                  {uploading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Drag and drop files here or click to select files
                    </>
                  )}
                </label>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card className="file-list">
            <Card.Header>Your Files</Card.Header>
            
            {loading ? (
              <div className="text-center p-4">
                <Spinner animation="border" />
                <p className="mt-2">Loading files...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center p-4">
                <p>No files found. Upload some files to get started!</p>
              </div>
            ) : (
              <ListGroup variant="flush">
                {files.map((file, index) => (
                  <ListGroup.Item key={index} className="file-item">
                    <div className="file-name">
                      <div className="fw-bold">{file.name}</div>
                      <div className="text-muted small">
                        Size: {formatFileSize(file.size)} | Modified: {file.modified}
                      </div>
                    </div>
                    <div className="file-actions">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => handleDownload(file.name)}
                      >
                        Download
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        onClick={() => handleDelete(file.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;