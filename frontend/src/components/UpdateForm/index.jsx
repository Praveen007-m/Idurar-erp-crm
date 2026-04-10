import { useEffect } from 'react';
import dayjs from 'dayjs';

import { useDispatch, useSelector } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { useCrudContext } from '@/context/crud';
import { selectUpdatedItem } from '@/redux/crud/selectors';
import { Form } from 'antd';
import Loading from '@/components/Loading';

const parseCollectionTime = (value) => {
  if (!value || typeof value !== 'string') return undefined;

  const trimmedValue = value.trim();
  const ampmMatch = trimmedValue.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);

  let normalizedValue = trimmedValue;
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = ampmMatch[2];
    const meridiem = ampmMatch[3].toUpperCase();

    if (!Number.isFinite(hour) || hour < 1 || hour > 12) return undefined;

    if (meridiem === 'AM' && hour === 12) hour = 0;
    if (meridiem === 'PM' && hour !== 12) hour += 12;

    normalizedValue = `${String(hour).padStart(2, '0')}:${minute}:00`;
  } else if (/^\d{2}:\d{2}$/.test(trimmedValue)) {
    normalizedValue = `${trimmedValue}:00`;
  }

  const parsedValue = dayjs(`1970-01-01T${normalizedValue}`);

  return parsedValue.isValid() ? parsedValue : undefined;
};

const normalizeFormValues = (values) => ({
  ...values,
  collectionTime: values?.collectionTime?.format
    ? values.collectionTime.format('HH:mm:ss')
    : values?.collectionTime || null,
});

export default function UpdateForm({ config, formElements, withUpload = false, onCancel }) {
  let { entity } = config;
  const dispatch = useDispatch();
  const { current, isLoading, isSuccess } = useSelector(selectUpdatedItem);

  const { state, crudContextAction } = useCrudContext();

  /////

  const { panel, collapsedBox, readBox } = crudContextAction;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      readBox.open();
    }
  };

  /////
  const [form] = Form.useForm();

  const onSubmit = (fieldsValue) => {
    const id = current._id;
    const normalizedValues = normalizeFormValues(fieldsValue);

    if (normalizedValues.file && withUpload) {
      normalizedValues.photo = normalizedValues.file[0].originFileObj;
      delete normalizedValues.file;
    }
    // const trimmedValues = Object.keys(fieldsValue).reduce((acc, key) => {
    //   acc[key] = typeof fieldsValue[key] === 'string' ? fieldsValue[key].trim() : fieldsValue[key];
    //   return acc;
    // }, {});
    dispatch(crud.update({ entity, id, jsonData: normalizedValues, withUpload }));
  };
  useEffect(() => {
    if (current) {
      let newValues = { ...current };
      if (newValues.birthday) {
        newValues = {
          ...newValues,
          birthday: dayjs(newValues['birthday']),
        };
      }
      if (newValues.date) {
        newValues = {
          ...newValues,
          date: dayjs(newValues['date']),
        };
      }
      if (newValues.startDate) {
        newValues = {
          ...newValues,
          startDate: dayjs(newValues['startDate']),
        };
      }
      if (newValues.collectionTime) {
        newValues = {
          ...newValues,
          collectionTime: parseCollectionTime(newValues.collectionTime),
        };
      }
      if (newValues.expiredDate) {
        newValues = {
          ...newValues,
          expiredDate: dayjs(newValues['expiredDate']),
        };
      }
      if (newValues.created) {
        newValues = {
          ...newValues,
          created: dayjs(newValues['created']),
        };
      }
      if (newValues.updated) {
        newValues = {
          ...newValues,
          updated: dayjs(newValues['updated']),
        };
      }
      form.resetFields();
      form.setFieldsValue(newValues);
    }
  }, [current]);

  useEffect(() => {
    if (isSuccess) {
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

      dispatch(crud.resetAction({ actionType: 'update' }));
    }
  }, [isSuccess]);

  const { isEditBoxOpen } = state;

  const show = isEditBoxOpen ? { display: 'block', opacity: 1 } : { display: 'none', opacity: 0 };
  return (
    <div style={show}>
      <Loading isLoading={isLoading}>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          {typeof formElements === 'function'
            ? formElements({ onCancel: handleCancel, loading: isLoading, isUpdateForm: true })
            : formElements}
        </Form>
      </Loading>
    </div>
  );
}
