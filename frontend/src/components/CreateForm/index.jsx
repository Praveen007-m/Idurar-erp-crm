import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { useCrudContext } from '@/context/crud';
import { selectCreatedItem } from '@/redux/crud/selectors';
import { Form } from 'antd';
import Loading from '@/components/Loading';

export default function CreateForm({ config, formElements, withUpload = false, onCancel }) {
  let { entity } = config;
  const dispatch = useDispatch();
  const { result: createdResult, isLoading, isSuccess } = useSelector(selectCreatedItem);
  const { crudContextAction } = useCrudContext();
  const { panel, collapsedBox, readBox } = crudContextAction;
  const [form] = Form.useForm();

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    form.resetFields();
    readBox.close();
    collapsedBox.close();
    panel.close();
  };

  const onSubmit = (fieldsValue) => {
    // Manually trim values before submission

    if (fieldsValue.file && withUpload) {
      fieldsValue.file = fieldsValue.file[0].originFileObj;
    }

    // const trimmedValues = Object.keys(fieldsValue).reduce((acc, key) => {
    //   acc[key] = typeof fieldsValue[key] === 'string' ? fieldsValue[key].trim() : fieldsValue[key];
    //   return acc;
    // }, {});

    dispatch(crud.create({ entity, jsonData: fieldsValue, withUpload }));
  };

  useEffect(() => {
    if (isSuccess) {
      // Ensure the read panel uses the latest entity data (including assigned staff and computed values)
      if (createdResult && createdResult._id) {
        dispatch(crud.currentItem({ data: createdResult }));

        // Re-read from server to ensure relational fields are fully populated (e.g., assigned staff name)
        dispatch(crud.read({ entity, id: createdResult._id }));
      }

      dispatch(crud.list({ entity }));

      if (config.closePanelOnSuccess) {
        form.resetFields();
        readBox.close();
        collapsedBox.close();
        panel.close();
      } else {
        readBox.open();
        collapsedBox.open();
        panel.open();
        form.resetFields();
      }

      dispatch(crud.resetAction({ actionType: 'create' }));
    }
  }, [isSuccess, createdResult]);

  return (
    <Loading isLoading={isLoading}>
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        {typeof formElements === 'function'
          ? formElements({ onCancel: handleCancel, loading: isLoading, isUpdateForm: false })
          : formElements}
      </Form>
    </Loading>
  );
}
