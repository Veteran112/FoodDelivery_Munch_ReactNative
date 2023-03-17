import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ImageBackground,
  Alert
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, ListItem, Icon, Card } from 'react-native-elements';
import PromotionEdit from './subcomponents/PromotionEdit';
import { Button } from 'react-native-elements';
import moment from 'moment';

const Stack = createStackNavigator();

export default function Promotion({ route }) {
  let menuItems = route.params.menu.menu_items

  if (typeof (menuItems) === 'string') {
    menuItems = JSON.parse(route.params.menu.menu_items).map(item => ({
      label: item.item_name,
      value: item.item_name
    }))
  } else {
    menuItems = route.params.menu.menu_items.map(item => ({
      label: item.item_name,
      value: item.item_name
    }))
  }
  return (
    <Stack.Navigator initialRouteName="Promotion">
      <Stack.Screen
        name="Promotion"
        component={PromotionScreen}
        initialParams={{
          promotions: route.params.promos,
          needsupdate: false,
          restaurantEmail: route.params.data.restaurantInfo.restaurantEmail,
          restaurantPhone: route.params.data.restaurantInfo.restaurantPhone
        }}
        options={({ navigation, route }) => ({
          headerRight: props => (
            <Button
              icon={<Icon name="create" size={15} color='#6A6A6A' />} // "#006FFF"
              titleStyle={{ color: '#6A6A6A' }}
              title="Create"
              type="clear"
              onPress={() => {
                navigation.navigate('PromotionEdit', {
                  promotion: [],
                  allPromos: route.params.promotions
                });
              }}
            />
          ),
          headerTitleAlign: 'center',
          headerTitleStyle: {},
        })}
      />
      <Stack.Screen
        name="PromotionEdit"
        component={PromotionEdit}
        initialParams={{
          promotion: [],
          allPromos: route.params.promos,
          needsupdate: true,
          menuItems: menuItems,
          restaurantEmail: route.params.data.restaurantInfo.restaurantEmail,
          restaurantPhone: route.params.data.restaurantInfo.restaurantPhone
        }}
        options={({ navigation, route }) => ({
          title: route.params.item ? 'Edit Promotion' : 'Create Promotion',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            color: 'black',
          },
          headerTintColor: '#6A6A6A',
          headerLeft: props => (
            <Button
              icon={
                <Icon
                  name="chevron-thin-left"
                  type="entypo"
                  size={15}
                  color='#6A6A6A'
                />
              }
              title="Back"
              style={styles.categoryEditorButton}
              titleStyle={{ color: '#6A6A6A' }}
              type="clear"
              onPress={() => {
                if (!route.params.needsupdate) {
                  navigation.goBack();
                } else {
                  Alert.alert(
                    'Unsaved Changes',
                    'Are you sure you want to cancel any promotion edits made?',
                    [
                      {
                        text: 'Ok',
                        onPress: () => {
                          navigation.goBack();
                        },
                      },
                      { text: 'Cancel' },
                    ],
                  );
                }

              }}
            />
          ),
          headerRight: props => (
            !route.params.needsupdate ? <Button
              icon={<Icon name="create" size={15} color='#6A6A6A' />}
              titleStyle={{ color: '#6A6A6A' }}
              title="Edit"
              type="clear"
              onPress={() => {
                navigation.setParams({ needsupdate: true });
              }}
            /> : null
          ),
        })}
      />
    </Stack.Navigator>
  );
}

function PromotionItem({ promotion, navigation, route, index }) {

  return (
    <TouchableOpacity
      activeOpacity={.4}
      style={{}}
      onPress={() =>
        navigation.navigate('PromotionEdit', {
          item: promotion,
          allPromos: route.params.promotions,
          index: index,
          needsupdate: false,
        })}
    >
      <Card containerStyle={[styles.cardStyle, (((new Date(promotion.end_time)).getTime() < (new Date()).getTime()) || (promotion.budget != 0 && Math.floor(promotion.budget / (promotion.discount * 0.3)) <= promotion.total_purchased)) && styles.expiredStyle]}>
        <View style={styles.imageStyle}>
          <ImageBackground
            source={{ uri: `${promotion.content_id}?date=${new Date().getSeconds()}` }}
            resizeMode='cover'
            style={[styles.imageStyle, { height: 100 }]} // Change resize mode based on requirements
            imageStyle={styles.imageStyle}
          >
          </ImageBackground>
        </View>
        <View style={{ paddingHorizontal: 15, paddingTop: 5 }}>
          <Text style={styles.restaurantName}>
            {promotion.title}
          </Text>
          {(!promotion.end_time || new Date(promotion.end_time) < new Date())
            ? <View style={[styles.containerItem, { paddingBottom: 5, justifyContent: 'center' }]}>
              <Text style={[styles.subtitleStyle, { color: 'black', fontSize: 18 }]}>Expired</Text>
            </View>
            : (promotion.budget != 0 && Math.floor(promotion.budget / (promotion.discount * 0.3)) <= promotion.total_purchased)
              ? <View style={[styles.containerItem, { paddingBottom: 5, justifyContent: 'center' }]}>
                <Text style={[styles.subtitleStyle, { color: 'black', fontSize: 18 }]}>Sold Out</Text>
              </View>
              : <View style={[styles.containerItem, { paddingBottom: 5 }]}>
                <Text style={styles.subtitleStyle}>
                  Start: {moment(new Date(promotion.start_time)).format('MM/DD/YYYY')}
                </Text>
                <Text style={styles.subtitleStyle}>
                  Exp: {moment(new Date(promotion.end_time)).format('MM/DD/YYYY')}
                </Text>
              </View>
          }
          <View style={[styles.containerItem, { paddingBottom: 5 }]}>
            <Text style={[styles.subtitleStyle, { color: '#F1695F', flex: 2 }]}>
              {promotion.total_purchased} sold at ${promotion.discount} each
            </Text>
            <Text style={[styles.subtitleStyle, { color: '#F1695F', flex: 2, textAlign: 'right' }]}>
              ${promotion.total_purchased * promotion.discount * 0.3} spent so far
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function PromotionScreen({ route, navigation }) {
  let activeList = route.params.promotions.filter(promo => (new Date(parseInt(promo.end_time))).getTime() >= (new Date()).getTime());
  let expList = route.params.promotions.filter(promo => (new Date(parseInt(promo.end_time))).getTime() < (new Date()).getTime());
  let soldList = activeList.filter(promo => Math.floor(promo.budget / (promo.discount * 0.3)) <= promo.total_purchased);

  activeList = activeList.filter(promo => Math.floor(promo.budget / (promo.discount * 0.3)) > promo.total_purchased);
  activeList = activeList.sort((a, b) => (new Date(a.end_time)).getTime() >= (new Date(b.end_time)).getTime());
  expList = expList.sort((a, b) => (new Date(a.end_time)).getTime() < (new Date(b.end_time)).getTime());
  soldList = soldList.sort((a, b) => (new Date(a.end_time)).getTime() < (new Date(b.end_time)).getTime());

  return (
    <View style={{ paddingTop: 14, height: '100%', backgroundColor: '#ececec' }}>
      <View style={{ backgroundColor: '#ececec' }}>
        <FlatList
          style={{ backgroundColor: '#ececec' }}
          data={activeList.concat(soldList).concat(expList)}
          renderItem={({ item, index }) => (
            <PromotionItem
              promotion={item}
              key={index + ''}
              navigation={navigation}
              route={route}
              index={index}
            />
          )}
          keyExtractor={(item, index) => index + ''}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orderHeadings: {
    textAlign: 'center',
    color: '#03a5fc',
    padding: 10,
    fontWeight: 'bold',
    fontSize: 24,
    backgroundColor: '#fff',
  },
  promotionItem: {
    backgroundColor: 'white',
    marginBottom: 3,
    display: 'flex',
    flexDirection: 'row',
    padding: 5,
  },
  cardStyle: {
    backgroundColor: '#ffffff',
    opacity: 1,
    shadowOpacity: 0,
    borderWidth: 0,
    padding: 0,
    margin: 30,
    borderRadius: 10,
    paddingBottom: 15,
  },
  imageStyle: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  containerItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restaurantName: {
    color: '#111C26',
    fontSize: 18,
    fontWeight: "bold",
    paddingVertical: 5,
  },
  subtitleStyle: {
    color: '#888E94',
    fontSize: 14,
  },
  subHeader: {
    textAlign: 'center',
    color: '#03a5fc',
    padding: 10,
    fontStyle: 'italic',
    fontSize: 20,
  },
  expiredStyle: {
    opacity: 0.5,
  }
});
