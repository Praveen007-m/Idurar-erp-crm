import React, { useEffect, useState } from "react";
import { Table, Button, Form, Input, Select, Modal, message, Space, Grid, Typography } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { crud } from "@/redux/crud/actions";
import { selectListItems } from "@/redux/crud/selectors";
import { ErpLayout } from "@/layout";
import { request } from "@/request";
import {
  validatePhoneNumber,
  handlePhoneInput,
  handlePhoneKeyPress,
  handlePhonePaste,
} from "@/utils/helpers";

export default function Staff() {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();

  const dispatch = useDispatch();

  const { result = {} } = useSelector(selectListItems);

  // show only staff users
  const items = (result?.items || []).filter((u) => u.role === "staff");

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [currentStaff, setCurrentStaff] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {

    dispatch(
      crud.list({
        entity: "admin",
        options: {
          page: 1,
          items: 10
        }
      })
    );

  }, [dispatch]);

  // Function to refresh the staff list
  const refreshList = () => {
    dispatch(
      crud.list({
        entity: "admin",
        options: {
          page: 1,
          items: 10
        }
      })
    );
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Mobile",
      dataIndex: "phone",
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            shape="circle"
            icon={<EditOutlined />}
            onClick={() => handleEditClick(record)}
          />
          <Button
            danger
            shape="circle"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteClick(record)}
          />
        </Space>
      ),
    },
  ];

  // Handle Edit button click
  const handleEditClick = (record) => {
    setCurrentStaff(record);
    editForm.setFieldsValue({
      name: record.name,
      phone: record.phone,
      email: record.email,
    });
    setEditOpen(true);
  };

  // Handle Edit form submit
  const handleEditStaff = async (values) => {
    setEditLoading(true);

    try {
      const response = await request.patch({
        entity: "admin/updateStaff/" + currentStaff._id,
        jsonData: values,
      });

      if (!response?.success) {
        message.error(response?.message || "Failed to update staff");
        return;
      }

      message.success("Staff updated successfully");

      editForm.resetFields();
      setEditOpen(false);
      setCurrentStaff(null);

      // refresh list
      refreshList();

    } catch (error) {

      message.error(
        error?.response?.data?.message || "Failed to update staff"
      );

    }
    finally {
      setEditLoading(false);
    }

  };

  // Handle Delete button click
  const handleDeleteClick = (record) => {

    Modal.confirm({
      title: "Are you sure you want to delete this staff member?",
      content: `This will remove ${record.name} from the system.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {

          await request.delete({
            entity: "admin/deleteStaff/" + record._id,
          });

          message.success("Staff deleted successfully");

          // refresh list
          refreshList();

        } catch (error) {

          message.error(
            error?.response?.data?.message || "Failed to delete staff"
          );

        }
      },
    });

  };

  const handleCreateStaff = async (values) => {
    setCreateLoading(true);

    const payload = {
      name: values.name?.trim(),
      email: values.email?.trim().toLowerCase(),
      phone: values.phone,
      role: values.role,
      password: values.password,
    };

    try {
      const response = await request.post({
        entity: "admin/createStaff",
        jsonData: payload,
      });

      if (!response?.success) {
        message.error(response?.message || "Failed to create staff");
        return;
      }

      message.success("Staff created successfully");

      form.resetFields();
      setOpen(false);

      // refresh list
      refreshList();

    } catch (error) {

      message.error(
        error?.response?.data?.message || "Failed to create staff"
      );

    }
    finally {
      setCreateLoading(false);
    }

  };

  return (
    <ErpLayout>
      <div
        style={{
          margin: screens.xs && !screens.md ? "16px" : "24px 32px",
          padding: screens.xs && !screens.md ? "16px" : "24px",
          background: "#ffffff",
          border: "1px solid #f0f0f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <Typography.Title level={2} style={{ margin: 0 }}>
            Staff
          </Typography.Title>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
            style={{
              minWidth: screens.xs && !screens.sm ? "100%" : undefined,
            }}
          >
            Create Staff
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={items}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
        />
      </div>

      {/* Create Staff Modal */}
      <Modal
        title="Create Staff"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={600}
      >

        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateStaff}
        >

          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please enter name" }]}
          >
            <Input placeholder="Enter staff name" />
          </Form.Item>

          <Form.Item
            label="Mobile Number"
            name="phone"
            rules={[
              { required: true, message: "Please enter mobile number" },
              {
                pattern: validatePhoneNumber,
                message: "Enter valid 10-digit mobile number starting with 9,8,7,6",
              },
            ]}
          >
            <Input
              placeholder="Enter mobile number"
              maxLength={10}
              inputMode="numeric"
              onInput={handlePhoneInput}
              onKeyPress={handlePhoneKeyPress}
              onPaste={handlePhonePaste}
            />
          </Form.Item>

          <Form.Item
            label="Login Email"
            name="email"
            rules={[
              { required: true, message: "Please enter login email" },
              { type: "email", message: "Enter a valid email address" },
            ]}
          >
            <Input
              placeholder="Enter login email"
              onInput={(e) => {

                let value = e.target.value.replace(/\s/g, "");
                e.target.value = value.toLowerCase();

              }}
            />
          </Form.Item>

          <Form.Item
            label="Login Password"
            name="password"
            rules={[
              { required: true, message: "Password is required" },
              { min: 6, message: "Minimum 6 characters" },
            ]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Confirm password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm password" />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            initialValue="staff"
          >
            <Select>
              <Select.Option value="staff">Staff</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={createLoading}>
              Create Staff
            </Button>
          </Form.Item>

        </Form>

      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        title="Edit Staff"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setCurrentStaff(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >

        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditStaff}
        >

          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please enter name" }]}
          >
            <Input placeholder="Enter staff name" />
          </Form.Item>

          <Form.Item
            label="Mobile Number"
            name="phone"
            rules={[
              { required: true, message: "Please enter mobile number" },
              {
                pattern: validatePhoneNumber,
                message: "Enter valid 10-digit mobile number starting with 9,8,7,6",
              },
            ]}
          >
            <Input
              placeholder="Enter mobile number"
              maxLength={10}
              inputMode="numeric"
              onInput={handlePhoneInput}
              onKeyPress={handlePhoneKeyPress}
              onPaste={handlePhonePaste}
            />
          </Form.Item>

          <Form.Item
            label="Login Email"
            name="email"
            rules={[
              { required: true, message: "Please enter login email" },
              { type: "email", message: "Enter a valid email address" },
            ]}
          >
            <Input
              placeholder="Enter login email"
              onInput={(e) => {

                let value = e.target.value.replace(/\s/g, "");
                e.target.value = value.toLowerCase();

              }}
            />
          </Form.Item>

          <Form.Item
            label="New Password (leave blank to keep current)"
            name="password"
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={editLoading}>
                Update Staff
              </Button>
              <Button onClick={() => {
                setEditOpen(false);
                setCurrentStaff(null);
                editForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>

        </Form>

      </Modal>

    </ErpLayout>
  );
}

