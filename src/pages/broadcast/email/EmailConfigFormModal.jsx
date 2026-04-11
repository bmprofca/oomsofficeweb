import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col, Spinner } from "react-bootstrap";
import { toast } from "react-hot-toast";
import { emailApi } from "./emailApi";

const emptyForm = {
  config_id: "",
  config_name: "",
  host: "",
  port: "",
  secure: false,
  username: "",
  password: "",
  from_email: "",
  from_name: "",
  reply_to: "",
  is_default: false,
  status: "active",
};

const EmailConfigFormModal = ({ show, onHide, onSuccess, editData }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const isEdit = Boolean(editData?.config_id);

  useEffect(() => {
    if (!show) return;
    setForm({
      ...emptyForm,
      ...editData,
      secure: Boolean(editData?.secure),
      is_default: Boolean(editData?.is_default),
      status: editData?.status || "active",
    });
  }, [show, editData]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    if (
      !form.config_name ||
      !form.host ||
      !form.port ||
      !form.username ||
      !form.from_email
    ) {
      toast.error("Please fill required fields");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        config_id: form.config_id,
        config_name: form.config_name,
        host: form.host,
        port: Number(form.port),
        secure: form.secure ? 1 : 0,
        from_email: form.from_email,
        from_name: form.from_name,
        reply_to: form.reply_to,
        is_default: form.is_default ? 1 : 0,
        status: form.status,
      };

      if (isEdit) {
        await emailApi.updateConfig({
          ...payload,
          smtp_username: form.username, // required backend key for update
          password: form.password || undefined,
        });
      } else {
        await emailApi.createConfig({
          ...payload,
          username: form.username, // required backend key for create
          password: form.password,
        });
      }

      toast.success(isEdit ? "SMTP config updated" : "SMTP config created");
      onSuccess?.();
      onHide?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to save SMTP config",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!validate()) return;
    setTesting(true);
    try {
      await emailApi.testConfig({
        config_id: form.config_id || undefined,
        host: form.host,
        port: Number(form.port),
        secure: form.secure ? 1 : 0,
        username: form.username,
        password: form.password,
        from_email: form.from_email,
        from_name: form.from_name,
      });
      toast.success("SMTP test successful");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || "SMTP test failed",
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEdit ? "Edit SMTP Config" : "Add SMTP Config"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Config Name *</Form.Label>
                <Form.Control
                  name="config_name"
                  value={form.config_name}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Host *</Form.Label>
                <Form.Control
                  name="host"
                  value={form.host}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Port *</Form.Label>
                <Form.Control
                  name="port"
                  value={form.port}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Username *</Form.Label>
                <Form.Control
                  name="username"
                  value={form.username}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Password {!isEdit && "*"}</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>From Email *</Form.Label>
                <Form.Control
                  name="from_email"
                  value={form.from_email}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>From Name</Form.Label>
                <Form.Control
                  name="from_name"
                  value={form.from_name}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Reply-To</Form.Label>
                <Form.Control
                  name="reply_to"
                  value={form.reply_to}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={form.status}
                  onChange={onChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end gap-3">
              <Form.Check
                type="checkbox"
                label="Secure"
                name="secure"
                checked={form.secure}
                onChange={onChange}
              />
              <Form.Check
                type="checkbox"
                label="Default"
                name="is_default"
                checked={form.is_default}
                onChange={onChange}
              />
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Close
        </Button>
        <Button
          variant="outline-primary"
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? <Spinner size="sm" /> : "Test SMTP"}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" /> : isEdit ? "Update" : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EmailConfigFormModal;
