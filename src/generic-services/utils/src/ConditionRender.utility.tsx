
/**
 * 优雅的条件渲染器
 * @example 
 * <If condition = {true}> 将会渲染出来 </If>
 *  <If condition = {() => false}> 将不会渲染出来 </If>  ;
 *  <If condition = {() => false}>
 *  	<>condition为<b>true</b>时会渲染</>
 *  	{Else}
 *  	<>condition为<b>false</b>时会渲染</>
 *  </If>  ;
 * @param children {ReactNode} 要条件渲染的 ReactNode ;
 * @param condition {boolean | function : boolean} ;
 */
export const If = ({children, condition}) => {
  /*cond : 拿到条件值: boolean*/
  const cond = (function () {
    if (typeof condition === 'function') {
      return condition();
    } else {
      return condition;
    }
  })();
  const result = (val = null) => <>{val}</>;

  if (Array.isArray(children) === true) {
    const [ELSE_JSX] = children.filter(value => value?.type === Else);
    const mapCallback = element => {
      if (typeof element === 'function') return element();
      else return element;
    };
    if (ELSE_JSX === undefined) {
      if (cond === true) {
        return result(children.map(mapCallback));
      } else {
        return result();
      }
    }
    const [the_first, the_last] = [
      children.slice(0, children.indexOf(ELSE_JSX)),
      children.slice(children.indexOf(ELSE_JSX) + 1),
    ];
    if (cond === true) {
      return result(the_first.map(mapCallback));
    } else {
      return result(the_last.map(mapCallback));
    }
  } else if (typeof children === 'function') {
    /*如果是函数 , 则返回函数的返回值 , 这里直接调用函数而非以组件形式调用*/
    if (cond === true) return result(children());
    else return result();
  } else {
    /*如果是数组 , 则条件渲染*/
    /*如果children不是数组类型 是个text或单一元素 , 则根据condition来决定是否渲染children*/
    if (cond === true) {
      return result(children);
    } else {
      return result();
    }
  }
};
export const Else = () => null;
If.Else = Else;

type Switch = React.FunctionComponent<{
  children;
  target;
}> & {
  Case: Function;
  Default: Function;
};
export const Switch = (({children, target}) => {
  const {Case, Default} = Switch;
  let flag = Symbol('缺省--空值');
  let $Default: any = flag;
  let result: any = flag;
  if (Array.isArray(children)) {
    children.forEach(node => {
      const {props, type} = node;
      const {children} = props;
      if (type !== Case && type !== Default) {
        throw 'Switch组件的Children每一项必须是Case(可以包含一个Default)';
      }
      if (type === Default) {
        $Default = node;
      }
      if (Set.prototype === Object.getPrototypeOf(props.value)) {
        props.value.forEach(value$forEach => {
          if (value$forEach === target) {
            result = children;
          }
        });
      } else {
        if (props.value === target) {
          result = children;
        }
      }
    });
  } else {
    throw 'xxx2x4xx';
  }
  if (result === flag /*如果遍历结束后result还是flag , 就说明case中没有任何一项匹配*/) {
    if ($Default === flag /*看看有没有Default组件 */) {
      result = null;
    } else {
      result = $Default.props.children;
    }
  }

  return result;
}) as Switch;
/*
 如果<Case/>.props.value是个Set , 就认为是多值匹配同一个返回结果
 类似于switch(value){case 1:case 2:case3:return "xxx";}
 */
Object.assign(Switch, {
  Case: ({value, children}) => {},
  Default: ({children}) => {},
});

function $example() {
  const {Case, Default} = Switch;
  <Switch target={Math.random()}>
    <Case value={123}>22323</Case>
    <Case value={new Set([3232, 2312])}>cccccccccc</Case>
    <Default value={''}></Default>
  </Switch>;
}
