import type { FC } from 'react';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import type { CaptchaModel, CaptchaProps, CaptchaType } from './PropsType';
import {
  aesEncrypt,
  Anchor,
  check,
  createNamespace,
  noop,
  picture,
  storage,
} from '../utils';
import './style/index.less';
import Popup from '../popup';
import Loading from '../loading';
import Slider from '../slider';
import Points from '../points';
import classNames from 'classnames';
import useSetState from '../utils/hooks';

const [bem] = createNamespace('captcha');

const Captcha: FC<CaptchaProps> = forwardRef((props, ref) => {
  const { type, onCancel, onSuccess, onFail, path, className, style } = props;
  const [visible, toggle] = useState<boolean>(false);
  const [captcha,setCaptcha] = useState<CaptchaModel>({})
  const [state, setState] = useSetState<{
    count: number,captchaType: CaptchaType
  }>({
    count: 0,
    captchaType: type
  });
  const {count,captchaType} = state;
  const fetch = async () => {
    toggle(true);
    const vr = Anchor[captchaType];
    const { repCode, repData,repMsg } = await picture(path, {
      captchaType: vr.captchaType,
      clientUid: localStorage.getItem(vr.name),
      ts: Date.now(),
    });
    if (repCode === '0000') {
      setCaptcha(vr.data(repData));
    }else {
      onFail(repMsg)
    }
  };

  useEffect(()=>{
    if(count > 0){
      fetch()
    }
  },[count])

  const fail = () => {
    const c = count + 1;
    if (c > 2 && captchaType === 'auto') {
      setState({
        count: c, captchaType: 'point'
      })
    }else {
      setState({count: c})
    }
  };
  const success = (data: any) => {
    setTimeout(()=>{
      onSuccess(data);
      toggle(false);
      setCaptcha({})
    },1000)
  };

  const valid = (param: string, second: any) => {
    return new Promise<boolean>((resolve) => {
      const vr = Anchor[captchaType];
      const data = {
        captchaType: vr.captchaType,
        pointJson: captcha.secretKey
          ? aesEncrypt(param, captcha.secretKey)
          : param,
        token: captcha.token,
        clientUid: localStorage.getItem(vr.name),
        ts: Date.now(),
      };
      check(path, data)
        .then((res) => {
          const validate: boolean = res.repCode === '0000';
          if (validate) {
            success(second);
          } else {
            fail();
          }
          resolve(validate);
        })
        .catch(() => resolve(false));
    });
  };

  useImperativeHandle(ref, () => ({ verify: fetch }));
  const cancel = () => {
    toggle(false);
    onCancel();
  };

  useEffect(() => {
    storage();
  }, []);


  const renderBody = () => {
    if (! captcha.image) {
      return <Loading />;
    }
    if (['auto', 'slide'].includes(captchaType)) {
      return <Slider onValid={valid} captcha={captcha} />;
    }
    return <Points onValid={valid} captcha={captcha} />;
  };
  return (
    <div className={classNames(bem(), className)} style={style}>
      <Popup visible={visible} onCancel={cancel}>
        {renderBody()}
      </Popup>
      {props.children}
    </div>
  );
});

Captcha.defaultProps = {
  type: 'auto', // slider point auto
  onCancel: noop,
  onFail: noop,
  onSuccess: noop,
};

export default Captcha;
