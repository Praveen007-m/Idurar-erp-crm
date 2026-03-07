import React, { useEffect, useState } from "react";
import { Table, Button, Form, Input, Select, Modal, message, Space } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { crud } from "@/redux/crud/actions";
import { selectListItems } from "@/redux/crud/selectors";
import { ErpLayout } from "@/layout";
import { request } from "@/request";

export default function Staff() {

  const dispatch = useDispatch();

  const { result = {} } = useSelector(selectListItems);

  // show only staff users
  const items = (result?.items || []).filter((u) => u.role === "staff");

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [currentStaff, setCurrentStaff] = useState(null);

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

    try {

      await request.patch({
        entity: "admin/updateStaff/" + currentStaff._id,
        jsonData: values,
      });

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

    try {

      await request.post({
        entity: "admin/createStaff",
        jsonData: values,
      });

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

  };

  return (
    <ErpLayout>

      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>
        Create Staff
      </Button>

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
            rules={[{ required: true, message: "Please enter mobile number" }]}
          >
            <Input
              placeholder="Enter mobile number"
              maxLength={10}
              inputMode="numeric"
              onInput={(e) => {

                let value = e.target.value.replace(/\D/g, "");

                if (value.length === 1 && !/[6-9]/.test(value)) {
                  value = "";
                }

                e.target.value = value.slice(0, 10);

              }}
            />
          </Form.Item>

          <Form.Item
            label="Login Email"
            name="email"
            rules={[{ required: true, message: "Please enter login email" }]}
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
            rules={[{ required: true, message: "Please enter password" }]}
          >
            <Input.Password placeholder="Enter password" />
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
            <Button type="primary" htmlType="submit" block>
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
            rules={[{ required: true, message: "Please enter mobile number" }]}
          >
            <Input
              placeholder="Enter mobile number"
              maxLength={10}
              inputMode="numeric"
              onInput={(e) => {

                let value = e.target.value.replace(/\D/g, "");

                if (value.length === 1 && !/[6-9]/.test(value)) {
                  value = "";
                }

                e.target.value = value.slice(0, 10);

              }}
            />
          </Form.Item>

          <Form.Item
            label="Login Email"
            name="email"
            rules={[{ required: true, message: "Please enter login email" }]}
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
              <Button type="primary" htmlType="submit">
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

