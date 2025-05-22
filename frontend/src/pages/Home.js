import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <Container>
      <Row className="mb-5">
        <Col className="text-center">
          <h1 className="display-4 mb-4">Welcome to ReplicaVault</h1>
          <p className="lead">
            Your secure cloud storage solution powered by GlusterFS.
            Store, share, and access your files from anywhere.
          </p>
          <div className="mt-4">
            <Link to="/register">
              <Button variant="primary" size="lg" className="me-3">Get Started</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline-primary" size="lg">Login</Button>
            </Link>
          </div>
        </Col>
      </Row>
      
      <Row className="mb-5">
        <Col xs={12} md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Secure Storage</Card.Title>
              <Card.Text>
                Your files are securely stored using GlusterFS, providing redundancy and high availability.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Easy Access</Card.Title>
              <Card.Text>
                Access your files from anywhere with our intuitive web interface.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>File Management</Card.Title>
              <Card.Text>
                Upload, download, and manage your files with ease.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-5">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>How It Works</Card.Title>
              <Card.Text>
                <ol>
                  <li>Create an account to get started</li>
                  <li>Upload your files securely to your personal vault</li>
                  <li>Access and manage your files from anywhere</li>
                  <li>Rest easy knowing your data is safe and redundant</li>
                </ol>
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;