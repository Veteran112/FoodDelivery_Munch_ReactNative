import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Loading from 'react-native-loading-spinner-overlay';
import { createStackNavigator } from '@react-navigation/stack';
import { Button, Icon } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import OrderDetails from './subcomponents/OrderDetails/OrderDetails';
import Modal from 'react-native-modal';
import { Auth } from 'aws-amplify';
import OrderHistory from './subcomponents/OrderHistory/OrderHistory';
import moment from 'moment';
import { orderContext } from '../context/OrderContext';

const Stack = createStackNavigator();

export default class Orders extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ordersList: props.route.params.data,
      numberOfOrders: props.route.params.data.length,
      nonCompletedOrders: 0,
      navigation: props.navigation,
      route: props.route
    };
  }

  componentDidMount() { }

  render() {
    return (
      <Stack.Navigator intialRouteName="Orders">
        <Stack.Screen
          name="Orders"
          component={OrdersList}
          initialParams={{
            ordersList: this.state.ordersList,
            numberOfOrders: this.state.numberOfOrders,
          }}
          options={({ navigation, route }) => ({
            title: 'Orders',
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTitleAlign: 'center',
            headerRight: props => (
              <Button
                icon={
                  <Icon
                    name="ccw"
                    type="entypo"
                    size={15}
                    color="#6A6A6A"
                  />
                }
                title="History"
                style={styles.categoryEditorButton}
                titleStyle={{ color: '#6A6A6A' }} // #006FFF
                type="clear"
                onPress={() => {
                  navigation.navigate('OrderHistory', {
                    ordersList: this.state.ordersList,
                    numberOfOrders: this.state.numberOfOrders,
                  });
                }}
              />
            ),
          })}
        />
        <Stack.Screen
          name="OrderDetails"
          component={OrderDetails}
          initialParams={{
            ordersList: this.state.ordersList,
            numberOfOrders: this.state.numberOfOrders,
          }}
          options={({ navigation, route }) => ({
            title: 'Order Details',
            headerTitleStyle: {
              color: 'black',
            },
            headerTitleAlign: 'center',
            headerTintColor: '#6A6A6A', //'#006FFF',
            headerLeft: () => (
              <Button
                icon={
                  <Icon
                    name="chevron-thin-left"
                    type="entypo"
                    size={15}
                    color="#D65344"
                  />
                }
                title="Back"
                style={styles.categoryEditorButton}
                titleStyle={{ color: '#D65344' }}
                type="clear"
                onPress={() => {
                  navigation.goBack()
                }}
              />
            ),
          })}
        />
        <Stack.Screen
          name="OrderHistory"
          component={OrderHistory}
          initialParams={{
            ordersList: this.state.ordersList,
            numberOfOrders: this.state.numberOfOrders,
          }}
          options={() => ({
            title: 'Order History',
            headerTitleStyle: {
              color: 'black',

            },
            headerTitleAlign: 'center',
            headerTintColor: '#6A6A6A', //'#006FFF',
          })}
        />
      </Stack.Navigator>
    );
  }
}

function OrdersList({ navigation, route }) {
  const {
    checkOrderDetails,
  } = useContext(orderContext);

  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [checked, setChecked] = useState([]);
  const [checkDetails, setCheckDetails] = useState(checkOrderDetails);
  const [loading, setloading] = useState(false);
  const [awaitingOrders, setAwaitingOrders] = useState([]);
  const [awaitingItemCounts, setAwaitingItemCounts] = useState(0);

  const today = moment().format("YYYY-MM-DD");

  useEffect(() => {
    isMounted = true;
    const fetchOrder = async () => {
      setloading(true);
      if (isMounted) {
        await Auth.currentUserInfo().then(userinfo => {
          let body = JSON.stringify({
            incoming_Id: userinfo.attributes.sub,
          });
          fetch(
            'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/restaurants/getorders',
            {
              method: 'POST',
              mode: 'cors', // no-cors, *cors, same-origin
              cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
              credentials: 'same-origin', // include, *same-origin, omit
              headers: {
                'Content-Type': 'application/json',
                'Connection': 'keep-alive',
              },
              redirect: 'follow', // manual, *follow, error
              referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
              body: body,
            },
          )
            .then(async res => {
              let response = await res.json();
              console.log('✅response', JSON.parse(response).orders);
              let orders = JSON.parse(response).orders.OrdersNew.sort((a, b) => {
                if (moment(b.time_order_placed) - moment(a.time_order_placed) > 0) {
                  return true;
                } else if (moment(b.time_order_placed) == moment(a.time_order_placed)) {
                  if (b.customer_name > a.customer_name) {
                    return true;
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              });
              let completed = orders.filter((one) => {
                return one.order_status === 'Completed' && moment(one.time_order_completed).format('YYYY-MM-DD') === today
              });
              setCompletedOrders(completed);
              let actives = orders.filter((one) => {
                return one.order_status !== 'Completed' && one.order_status !== 'Rejected'
              });
              setActiveOrders(actives);
              setloading(false);
              navigation.setParams({
                ...route.params,
                ordersList: route.params.ordersList,
              });
            })
            .catch(err => {
              setloading(false);
              console.log('responsedataerror', err);
            });
        });
      }
    };

    navigation.addListener('focus', fetchOrder);

    return () => {
      isMounted = false;
      navigation.removeListener('focus', fetchOrder);
    };
  })
  // }, [navigation, route.params]);

  useEffect(() => {
    const awaitingOrders2 = activeOrders.length > 0 ? activeOrders.filter(
      item =>
        item.order_status === 'Awaiting Confirmation' && // Awaiting Confirmation => ''
        !checked.includes(item.order_id),
    ) : [];
    setAwaitingOrders(awaitingOrders2);
    if (awaitingOrders2.length > 0) {
      let itemCount = 0;
      for (let item of awaitingOrders2[0].menu_items) {
        itemCount += parseInt(item.quantity) ?? 1
      }
      setAwaitingItemCounts(itemCount);
    }
  }, [activeOrders, checked]);

  useEffect(() => {
    setCheckDetails(checkOrderDetails);
  }, [checkOrderDetails]);

  const accept = (time) => {
    updateStatus('Being Prepared', time);
    setActiveOrders(activeOrders.map(item =>
      item.order_id === awaitingOrders[0].order_id ? { ...item, order_status: 'Being Prepared' } : item
    ))
    setAwaitingOrders(awaitingOrders.filter(item => item.order_id === awaitingOrders[0].order_id))
    setChecked([...checked, awaitingOrders[0].order_id]);
  };

  const reject = () => {
    updateStatus('Rejected', '0');
    navigation.setParams({
      ...route.params,
      ordersList: route.params.ordersList.map(item =>
        item.order_id === awaitingOrders[0].order_id
          ? { ...awaitingOrders[0], order_status: 'Rejected' }
          : item,
      ),
    });
    setChecked([...checked, awaitingOrders[0].order_id]);
  };

  const addToQueue = async () => {
    await updateStatus('Awaiting Confirmation', '0');
    setChecked([...checked, awaitingOrders[0].order_id]);
  }

  const updateStatus = async (status, wait_time) => {
    let body = {
      incoming_id: awaitingOrders[0].order_id,
      status,
      wait_time,
    };
    const response = await fetch(
      'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/orders/updateOrder',
      {
        method: 'POST',
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(body),
      },
    );
  };

  /* this is for Popup */
  const checkForSpecialInstructions = (item) => {
    if (item.instructions != undefined) {
      return (
        <Text style={styles.orderDetailsSpecialInstructions}>
          {'Special Instructions: ' + item.instructions}
        </Text>
      );
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#ececec', }}>
      <View style={{ flex: 1 }}>
        <Text h2 style={styles.orderHeadings}>
          {'Active Orders (' +
            activeOrders.length +
            ')'}
        </Text>
        <View style={{ flex: 1, minHeight: 200, borderTopWidth: 2, borderColor: '#D65344' }}>
          {activeOrders.length > 0 && activeOrders.map(order => {
            let itemCount = 0;
            for (let item of order.menu_items) {
              itemCount += parseInt(item.quantity) ?? 1
            }
            return (
              <TouchableOpacity
                style={styles.order}
                key={order.order_id}
                //TO DO: Bind this as a function
                onPress={() => {
                  let newOrder = JSON.parse(JSON.stringify(order));
                  console.log('Old status: ' + order.order_status);
                  navigation.navigate('OrderDetails', {
                    navigation: navigation,
                    ordersList: route.params.ordersList,
                    newOrder: newOrder,
                    order: order,
                  });
                }}>
                <View style={styles.nameTimeContainer}>
                  <Text h4
                    key={order.order_status}
                    style={[
                      styles.dropoffName,
                      { color: order.order_status == "Awaiting Confirmation" ? '#D65344' : '#313131' }
                    ]}>
                    {order.customer_name}
                  </Text>
                  <Text h5 style={styles.orderDate}>
                    {moment(order.time_order_placed).format('YYYY-MM-DD h:mm:ss A')}
                  </Text>
                </View>
                <Text h5
                  key={order.order_status}
                  style={[
                    styles.orderItemCount,
                    { color: order.order_status == "Awaiting Confirmation" ? '#D65344' : '#313131' }
                  ]}>
                  {itemCount + (itemCount > 1 ? ' items' : ' item')}
                </Text>
                <Text h2 style={styles.orderPrice}>
                  {'$' + parseFloat(order.order_total).toFixed(2)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text h2 style={styles.orderHeadings}>
          {`Completed (${completedOrders.length})`}
        </Text>
        <View style={{ flex: 1, minHeight: 200, borderTopWidth: 2, borderColor: '#D65344', }}>
          {completedOrders.length > 0 && completedOrders.map(order => {
            let itemCount = 0;
            for (let item of order.menu_items) {
              itemCount += parseInt(item.quantity) ?? 1
            }
            return (
              <TouchableOpacity
                style={styles.order}
                key={'completed_order_display_' + order.order_id}
                onPress={() => {
                  navigation.navigate('OrderDetails', {
                    order: order,
                  });
                }}>
                <View style={styles.nameTimeContainer}>
                  <Text h4 style={styles.dropoffName}>
                    {order.customer_name}
                  </Text>
                  <Text h5 style={styles.orderDate}>
                    {moment(order.time_order_placed).format('YYYY-MM-DD h:mm:ss A')}
                  </Text>
                </View>
                <Text h5 style={styles.orderItemCount}>
                  {itemCount + (itemCount > 1 ? ' items' : ' item')}
                </Text>
                <Text h2 style={styles.orderPrice}>
                  {'$' + order.order_total}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {awaitingOrders?.length > 0 && (
        <Modal isVisible={awaitingOrders.length > 0}>
          <View style={styles.modalInside}>
            <Text style={styles.restaurantName}>
              {awaitingOrders[0].customer_name}
            </Text>
            <Text h5 style={styles.orderItemCount2}>
              {awaitingItemCounts + (awaitingItemCounts > 1 ? ' items' : ' item')}
            </Text>
            {awaitingOrders[0].menu_items.map((item, i) => {
              return (
                <View
                  style={styles.orderDetailsItem}
                  key={awaitingOrders[0].order_id + '_' + item.item + '_' + i}>
                  <View style={styles.orderItemContainer}>
                    <Text style={styles.orderDetailsItemName}>{item.quantity}x {item.item}</Text>
                    {/* <Text style={styles.orderItemPrice}>{item.price}</Text> */}
                  </View>
                  {checkForSpecialInstructions(item)}
                </View>
              );
            })}
            {awaitingOrders[0].comment != undefined && (
              <Text style={styles.orderDetailsComment}>Instructions: {awaitingOrders[0].comment}</Text>
            )}
            <View style={styles.orderTotalContainer}>
              <Text style={styles.orderDetailsItemName}>Total Order</Text>
              <Text style={styles.orderItemPrice}>{awaitingOrders[0].order_total}</Text>
            </View>
            <View
              style={{
                display: 'flex',
                marginTop: 15,
                justifyContent: 'center',
              }}>
              <Button
                buttonStyle={styles.acceptButtonStyle}
                title="Accept"
                onPress={() =>
                  accept('15')
                }
              />
              <Button
                buttonStyle={styles.addQueueButtonStyle}
                title="Add To Queue"
                onPress={() => addToQueue()}
              />
              <Button
                buttonStyle={styles.rejectButtonStyle}
                title="Reject"
                onPress={() => reject()}
              />
            </View>
          </View>
        </Modal>
      )}
      <Loading visible={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  general: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  order: {
    borderBottomWidth: 2,
    borderColor: 'grey',
    backgroundColor: '#fff',
  },
  orderHeadings: {
    textAlign: 'center',
    color: '#6A6A6A', //'#006FFF',
    padding: 10,
    fontWeight: 'bold', //'600',
    fontSize: 24,
    backgroundColor: '#fff',
  },
  nameTimeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'space-between'
  },
  dropoffName: {
    textAlign: 'left',
    color: '#313131',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
  },
  orderDate: {
    marginLeft: 10,
    fontSize: 16,
    textAlign: 'right',
    marginRight: 10
  },
  orderItemCount: {
    marginLeft: 10,
    marginBottom: 5,
    fontSize: 15,
    color: '#313131',
  },
  orderPrice: {
    textAlign: 'right',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#313131',
    marginRight: 10,
    marginBottom: 15,
  },
  modalInside: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 15,
  },
  restaurantName: {
    marginVertical: 20,
    textAlign: 'center',
    fontSize: 20,
  },
  orderItemTitle: {},
  orderItemDescription: {
    fontSize: 12,
    color: '#111',
  },
  orderSubtotal: {
    fontSize: 25,
  },
  orderItemCount2: {
    marginTop: 10,
    marginLeft: 10,
    fontSize: 17,
    color: '#838383',
  },
  orderItemContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 5,
  },
  orderItemPrice: {
    marginRight: 10,
    textAlign: 'right',
    fontSize: 17,
  },
  orderDetailsItem: {
    borderBottomWidth: 2,
    borderColor: '#D65344',
    backgroundColor: '#fff',
  },
  orderDetailsItemName: {
    fontSize: 17,
    color: '#313131',
    marginLeft: 10,
  },
  orderDetailsComment: {
    fontSize: 15,
    color: '#313131',
    marginLeft: 10,
    marginTop: 10
  },
  orderTotalContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 5,
  },
  buttonStyle: {
    backgroundColor: '#D65344',
    paddingTop: 5,
    paddingBottom: 5,
    marginLeft: 5,
    marginRight: 5,
  },
  acceptButtonStyle: {
    backgroundColor: '#00733B',
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 75,
    paddingRight: 75,
    marginVertical: 5,
  },
  addQueueButtonStyle: {
    backgroundColor: '#D65344',
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 75,
    paddingRight: 75,
    marginVertical: 5,
  },
  rejectButtonStyle: {
    backgroundColor: '#6A6A6A',
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 75,
    paddingRight: 75,
    marginVertical: 5,
  },
  buttonTextStyle: {
    color: '#313131',
  },
  categoryEditorButton: {
    color: '#03a5fc',
  },
  orderDetailsSpecialInstructions: {
    paddingLeft: 20,
    paddingBottom: 10
  },
});