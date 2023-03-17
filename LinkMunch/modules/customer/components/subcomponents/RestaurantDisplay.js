import React, { useContext } from 'react';
import { textContext } from "../../context/TextContext";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
} from 'react-native';
import { Text, Card } from 'react-native-elements';
import CartButton from './Cart/CartButton';
import Timer from "./Timer/Timer"
import {checkoutContext} from '../../context/CheckoutContext';

export default function RestaurantDisplay({ navigation, route }) {
  const textCont = useContext(textContext);
  const timerCont = useContext(checkoutContext)

  let restaurants = [];
  let promos = route.params.promos;
  for (const restaurant of route.params.restaurantList) {
    if (restaurant.Profile && restaurant.Profile.restaurantInfo) {
      restaurants.push(restaurant);
    }
  }
  let sortedRestaurants = restaurants.filter(rest => {
    let name = rest.Profile.restaurantInfo.restaurantName;
    return name?.toLowerCase().includes(textCont.textVal.toLowerCase());
  })
    .sort((a, b) => {
      let aName = a.Profile.restaurantInfo.restaurantName;
      let bName = b.Profile.restaurantInfo.restaurantName;
      if (aName.toLowerCase().indexOf(textCont.textVal.toLowerCase()) > bName.toLowerCase().indexOf(textCont.textVal.toLowerCase())) {
        return 1;
      } else if (aName.toLowerCase().indexOf(textCont.textVal.toLowerCase()) < bName.toLowerCase().indexOf(textCont.textVal.toLowerCase())) {
        return -1;
      } else {
        if (aName > bName)
          return 1;
        else
          return -1;
      }
    });
  return (
    <textContext.Provider value={textCont}>
        <ScrollView>
          {sortedRestaurants.map(restaurant => {
            // obvs picture isnt working
            let picture = restaurant.Profile.picture; //might just have them upload one of their pictures
            let promotionList = promos.filter(promo => promo.restaurant_id == restaurant.RestaurantId);
            let todayDate = new Date().getDay();
            let todayOpen = restaurant.Profile.restaurantInfo.hoursOfOperation.sundayHours.sundayOpen;
            let todayClose = restaurant.Profile.restaurantInfo.hoursOfOperation.sundayHours.sundayClosed;

            if (todayDate == 0) {
              todayOpen = restaurant.Profile.restaurantInfo.hoursOfOperation.sundayHours.sundayOpen;
              todayClose = restaurant.Profile.restaurantInfo.hoursOfOperation.sundayHours.sundayClosed;
            } else if (todayDate == 1) {
              todayOpen = restaurant.Profile.restaurantInfo.hoursOfOperation.mondayHours.mondayOpen;
              todayClose = restaurant.Profile.restaurantInfo.hoursOfOperation.mondayHours.mondayClosed;
            } else if (todayDate == 2) {
              todayOpen = restaurant.Profile.restaurantInfo.hoursOfOperation.tuesdayHours.tuesdayOpen;
              todayClose = restaurant.Profile.restaurantInfo.hoursOfOperation.tuesdayHours.tuesdayClosed;
            } else if (todayDate == 3) {
              todayOpen = restaurant.Profile.restaurantInfo.hoursOfOperation.wednesdayHours.wednesdayOpen;
              todayClose = restaurant.Profile.restaurantInfo.hoursOfOperation.wednesdayHours.wednesdayClosed;
            } else if (todayDate == 4) {
              todayOpen = restaurant.Profile.restaurantInfo.hoursOfOperation.thursdayHours.thursdayOpen;
              todayClose = restaurant.Profile.restaurantInfo.hoursOfOperation.thursdayHours.thursdayClosed;
            } else if (todayDate == 5) {
              todayOpen = restaurant.Profile.restaurantInfo.hoursOfOperation.fridayHours.fridayOpen;
              todayClose = restaurant.Profile.restaurantInfo.hoursOfOperation.fridayHours.fridayClosed;
            } else if (todayDate == 6) {
              todayOpen = restaurant.Profile.restaurantInfo.hoursOfOperation.saturdayHours.saturdayOpen;
              todayClose = restaurant.Profile.restaurantInfo.hoursOfOperation.saturdayHours.saturdayClosed;
            }

            let openStr = "";
            if ((new Date(todayClose)).getTime() < todayDate) {
              openStr = "Closed";
            } else if ((new Date(todayClose)).getTime() < (todayDate - 60 * 60 * 1000)) {
              openStr = "Closing Soon"
            } else {
              openStr = "Open";
            }

            return (
              <TouchableOpacity
                key={
                  sortedRestaurants.indexOf(restaurant)
                }
                onPress={() => {
                  navigation.navigate('MyOrders', { restaurant: restaurant, profile: route.params.profile, menuItems: [], })
                }
                }>
                <Card containerStyle={styles.cardStyle}>
                  {promotionList.filter(promo => promo.end_time >= (new Date()).getTime()).filter(promo => Math.floor(promo.budget / (promo.discount * 0.3)) > promo.total_purchased).length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                      <Image
                        source={require('../../../assets/HomePromoTitle.png')}
                        style={{
                          marginLeft: 5,
                          marginRight: 3,
                          width: 15,
                          height: 15,
                          tintColor: '#FB322D',
                        }}
                        resizeMode={'stretch'}
                      />
                      <Text style={{ fontSize: 14, color: '#FB322D', fontWeight: 'bold' }}>Active Promos!</Text>
                    </View>
                  )}
                  <View style={styles.imageStyle}>
                    <ImageBackground
                      source={
                        !picture
                          ? require('../../assets/chorizo-mozarella-gnocchi-bake-cropped.jpg')
                          : { uri: picture }
                      }
                      resizeMode='contain'
                      style={[styles.imageStyle, { height: 120, marginTop: 10 }]} // Change resize mode based on requirements
                      imageStyle={styles.imageStyle}
                    >
                    </ImageBackground>
                  </View>
                  <View style={{ paddingHorizontal: 15, paddingTop: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.restaurantName}>
                        {restaurant.Profile.restaurantInfo.restaurantName}
                      </Text>
                      <Text style={styles.restaurantName}>
                        {openStr}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.subtitleStyle}>
                        {typeof restaurant.Profile.restaurantInfo
                          .restaurantAddress === 'object'
                          ? restaurant.Profile.restaurantInfo.restaurantAddress
                            .address
                          : restaurant.Profile.restaurantInfo.restaurantAddress}
                      </Text>
                      <Text style={styles.subtitleStyle}>
                        {todayOpen}{" "}-{" "}
                        {todayClose}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <CartButton navigation={navigation} />
    </textContext.Provider>
  );
}

const styles = StyleSheet.create({
  restaurantName: {
    color: '#111C26',
    fontSize: 20,
    fontWeight: "bold",
    paddingVertical: 5,
  },
  buttonStyle: {
    backgroundColor: '#F86D64',
    paddingTop: 15,
    paddingBottom: 15,
    borderRadius: 5,
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
  subtitleStyle: {
    color: '#888E94',
    fontSize: 14,
  }
});